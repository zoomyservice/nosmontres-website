/**
 * Nos Montres — Cloudflare Worker
 * Routes:
 *   GET  /?q=...           → Live / static price lookup
 *   POST /submit           → Store a sell lead in Workers KV
 *   GET  /leads.csv?key=.. → Download all leads as CSV
 *   GET  /leads.json?key=. → Download all leads as JSON
 *
 * KV SETUP (one-time):
 *   npx wrangler kv:namespace create LEADS
 *   → Copy the ID into wrangler.toml [[kv_namespaces]] id = "…"
 *   npx wrangler deploy
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

/* ─── Static price database (April 2026 secondary market) ─────────────────── */
const STATIC_PRICES = {
  rolex: {
    '124060': [11000, 14500], 'submariner no date': [11000, 14500],
    '126610ln': [12000, 15500], '126610lv': [13000, 17000],
    '126613lb': [15000, 22000], '126618lb': [26000, 38000],
    '116500ln': [14000, 21000], '126500ln': [16000, 26000],
    '116519ln': [18000, 35000], '116528': [20000, 42000],
    '126710blnr': [13500, 18000], '126710blro': [14500, 20000],
    '126711chnr': [24000, 38000], '126715chnr': [38000, 65000],
    '126334': [9500, 13500], '126300': [8500, 12500],
    '126231': [9500, 14500], '126233': [10000, 15500],
    '228238': [30000, 50000], '228239': [32000, 55000], '228235': [24000, 42000],
    '124270': [8000, 11000], '326934': [10000, 14500],
    '116400gv': [9000, 13500], '126600': [12500, 17500],
    'submariner': [11000, 38000], 'daytona': [14000, 80000],
    'gmt': [13500, 65000], 'datejust': [7500, 22000],
    'day-date': [22000, 85000], 'explorer': [7500, 12500],
    'sea-dweller': [12500, 18500], 'milgauss': [8500, 14000],
    '_default': [8500, 55000],
  },
  'audemars piguet': {
    '15500': [38000, 50000], '15202': [85000, 145000],
    '15400': [26000, 42000], '26331': [36000, 62000],
    '15710': [24000, 40000], '26470': [28000, 46000],
    '26480': [36000, 60000], '26405': [30000, 55000],
    'code 11.59': [22000, 50000], 'millenary': [18000, 45000],
    'royal oak offshore': [22000, 90000], 'royal oak': [30000, 145000],
    '_default': [22000, 145000],
  },
  'patek philippe': {
    '5711/1a': [76000, 148000], '5726/1a': [52000, 95000], '5980/1ar': [78000, 138000],
    '5711': [65000, 148000], '5712r': [62000, 108000],
    '5167/1a': [36000, 58000], '5168g': [62000, 115000], '5164a': [45000, 80000],
    '5296r': [22000, 40000], '5227g': [28000, 52000], '5153g': [35000, 65000],
    '5196': [18000, 30000], '5146': [45000, 80000], '5270': [95000, 165000],
    'nautilus': [52000, 200000], 'aquanaut': [28000, 115000],
    'calatrava': [18000, 65000], 'grand complications': [200000, 1000000],
    '_default': [18000, 200000],
  },
  'richard mille': {
    'rm 011': [170000, 340000], 'rm 027': [500000, 1200000],
    'rm 035': [140000, 270000], 'rm 055': [115000, 195000],
    'rm 067': [95000, 175000], 'rm 072': [190000, 390000],
    'rm 052': [240000, 490000], 'rm 69': [190000, 390000],
    '_default': [95000, 450000],
  },
  'cartier': {
    'santos': [5500, 14000], 'tank': [4500, 22000],
    'ballon bleu': [4000, 14000], 'panthere': [5000, 18000],
    'drive': [6000, 12000], 'cle': [5500, 11000],
    '_default': [4000, 22000],
  },
};

const norm = s => s.toLowerCase().replace(/[_\-\/\.\s]+/g, ' ').trim();

function staticLookup(query) {
  const q = norm(query);
  for (const [brand, db] of Object.entries(STATIC_PRICES)) {
    if (!q.includes(brand)) continue;
    const sortedKeys = Object.keys(db)
      .filter(k => k !== '_default')
      .sort((a, b) => {
        const aRef = /\d/.test(a), bRef = /\d/.test(b);
        if (aRef !== bRef) return aRef ? -1 : 1;
        return norm(b).length - norm(a).length;
      });
    for (const key of sortedKeys) {
      const k = norm(key);
      if (k.length > 0 && q.includes(k)) {
        const range = db[key];
        return { lowPrice: range[0], highPrice: range[1], currency: 'EUR', offerCount: 0, source: 'static' };
      }
    }
    return { lowPrice: db._default[0], highPrice: db._default[1], currency: 'EUR', offerCount: 0, source: 'static' };
  }
  return null;
}

// European country codes — exactly as Chrono24 uses them in their "Europe" filter
const EUROPE_COUNTRIES = [
  'DE','FR','CH','IT','ES','AT','NL','BE','PT','GR',
  'PL','CZ','RO','HU','SE','DK','FI','NO','IE','LU',
  'HR','SI','SK','LT','LV','EE','CY','MT','MC','LI',
  'IS','AL','RS','BA','ME','MK','MD','UA','BY','SM',
  'AD','GI','UK','BG',
].map(c => `countryIds=${c}`).join('&');

async function tryLivePrices(query) {
  const url = `https://www.chrono24.com/search/index.htm?query=${encodeURIComponent(query)}&dosearch=true&sortorder=1&currencyId=EUR&${EUROPE_COUNTRIES}`;
  try {
    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
      },
      redirect: 'follow',
    });
    if (!resp.ok) return null;
    const html = await resp.text();
    const match = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i);
    if (!match) return null;
    const parsed = JSON.parse(match[1]);
    const graph = parsed['@graph'] || [parsed];
    const agg = graph.find(n => n['@type'] === 'AggregateOffer');
    if (!agg?.lowPrice) return null;
    return {
      lowPrice: parseFloat(agg.lowPrice),
      highPrice: parseFloat(agg.highPrice),
      currency: agg.priceCurrency || 'EUR',
      offerCount: parseInt(agg.offerCount || 0),
      source: 'live',
    };
  } catch {
    return null;
  }
}

/* ─── Lead storage helpers ─────────────────────────────────────────────────── */
function csvEscape(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

const CSV_HEADERS = ['timestamp','brand','model','condition','papers','ref','name','phone','email','lang'];

function leadsToCSV(leads) {
  const rows = [CSV_HEADERS.join(',')];
  for (const lead of leads) {
    rows.push(CSV_HEADERS.map(h => csvEscape(lead[h])).join(','));
  }
  return rows.join('\r\n');
}

/* ─── Main handler ─────────────────────────────────────────────────────────── */
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    /* Preflight */
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    /* ── POST /submit — store lead ── */
    if (request.method === 'POST' && url.pathname === '/submit') {
      try {
        const body = await request.json();
        const id = Date.now().toString() + '-' + Math.random().toString(36).slice(2, 6);
        const lead = {
          timestamp: new Date().toISOString(),
          brand:     body.brand     || '',
          model:     body.model     || '',
          condition: body.condition || '',
          papers:    body.papers    || '',
          ref:       body.ref       || '',
          name:      body.name      || '',
          phone:     body.phone     || '',
          email:     body.email     || '',
          lang:      body.lang      || 'fr',
        };
        if (env.LEADS) {
          await env.LEADS.put(id, JSON.stringify(lead));
        }
        return Response.json({ ok: true, id }, { headers: CORS });
      } catch (e) {
        return Response.json({ ok: false, error: e.message }, { status: 400, headers: CORS });
      }
    }

    /* ── GET /leads.csv — export all leads as CSV ── */
    if (request.method === 'GET' && url.pathname === '/leads.csv') {
      const key = url.searchParams.get('key');
      if (!env.ADMIN_KEY || key !== env.ADMIN_KEY) {
        return new Response('Unauthorized', { status: 401 });
      }
      const leads = await getAllLeads(env);
      const csv = leadsToCSV(leads);
      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="leads-nosmontres.csv"',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    /* ── GET /leads.json — export all leads as JSON ── */
    if (request.method === 'GET' && url.pathname === '/leads.json') {
      const key = url.searchParams.get('key');
      if (!env.ADMIN_KEY || key !== env.ADMIN_KEY) {
        return new Response('Unauthorized', { status: 401 });
      }
      const leads = await getAllLeads(env);
      return Response.json(leads, { headers: { 'Access-Control-Allow-Origin': '*' } });
    }

    /* ── GET /?q=... — price lookup ── */
    const query = (url.searchParams.get('q') || '').trim();
    if (query.length < 3) {
      return Response.json({ error: 'query_too_short' }, { status: 400, headers: CORS });
    }
    const live = await tryLivePrices(query);
    if (live) {
      return Response.json(live, { headers: { ...CORS, 'Cache-Control': 'public, max-age=900' } });
    }
    const stat = staticLookup(query);
    if (stat) {
      return Response.json(stat, { headers: { ...CORS, 'Cache-Control': 'public, max-age=1800' } });
    }
    return Response.json({ error: 'not_found', query }, { status: 404, headers: CORS });
  },
};

async function getAllLeads(env) {
  if (!env.LEADS) return [];
  const list = await env.LEADS.list();
  const leads = await Promise.all(
    list.keys.map(k => env.LEADS.get(k.name, { type: 'json' }))
  );
  return leads.filter(Boolean).sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
}
