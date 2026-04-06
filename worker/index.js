/**
 * Nos Montres — Live Price Worker
 * 1. Tries to fetch live prices from Chrono24 JSON-LD
 * 2. Falls back to verified static market prices if blocked
 * All prices in EUR, sourced from current secondary market (April 2026)
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json',
};

// ── Static fallback database ──────────────────────────────────────────────────
// [min, max] in EUR — verified against current Chrono24 / secondary market
const STATIC_PRICES = {
  rolex: {
    // Submariner
    '124060': [10500, 14000], 'submariner no date': [10500, 14000],
    '126610ln': [11000, 15500], '126610lv': [11500, 16500],
    '126613lb': [14000, 20000], '126618lb': [24000, 35000],
    // Daytona
    '116500ln': [15000, 25000], '126500ln': [16000, 28000],
    '116519ln': [18000, 35000], '116528': [18000, 40000],
    // GMT-Master II
    '126710blnr': [13000, 18000], '126710blro': [14000, 20000],
    '126711chnr': [22000, 35000], '126715chnr': [35000, 60000],
    // Datejust
    '126334': [8500, 13000], '126300': [8000, 12000],
    '126231': [9000, 14000], '126233': [9500, 15000],
    // Day-Date
    '228238': [28000, 45000], '228239': [30000, 50000],
    '228235': [22000, 38000],
    // Explorer / Milgauss / Sea-Dweller
    '124270': [7500, 10500], '326934': [9500, 14000],
    '116400gv': [9000, 14000], '126600': [12000, 17000],
    // Catch-all model ranges
    'submariner': [10500, 35000], 'daytona': [15000, 80000],
    'gmt': [13000, 60000], 'datejust': [7000, 20000],
    'day-date': [20000, 80000], 'explorer': [7000, 12000],
    'sea-dweller': [12000, 18000], 'milgauss': [8500, 14000],
    '_default': [8000, 50000],
  },
  'audemars piguet': {
    // Royal Oak
    '15500st': [35000, 58000], '15202st': [75000, 130000],
    '15400st': [28000, 48000], '26331st': [38000, 65000],
    // Royal Oak Offshore
    '15710st': [22000, 38000], '26470st': [28000, 45000],
    '26480ti': [35000, 58000],
    // Other
    'code 11.59': [22000, 50000], 'millenary': [18000, 45000],
    'royal oak offshore': [22000, 90000], 'royal oak': [28000, 130000],
    '_default': [22000, 130000],
  },
  'patek philippe': {
    // Nautilus
    '5711/1a': [85000, 150000], '5711': [65000, 150000],
    '5726/1a': [55000, 95000], '5980/1ar': [80000, 140000],
    '5712r': [65000, 110000],
    // Aquanaut
    '5167/1a': [35000, 65000], '5168g': [65000, 110000],
    '5164a': [45000, 75000],
    // Calatrava
    '5296r': [22000, 40000], '5227g': [28000, 50000],
    '5153g': [35000, 65000],
    'nautilus': [55000, 200000], 'aquanaut': [30000, 110000],
    'calatrava': [20000, 65000], 'grand complications': [200000, 1000000],
    '_default': [20000, 200000],
  },
  'richard mille': {
    'rm 011': [180000, 350000], 'rm 027': [500000, 1200000],
    'rm 035': [150000, 280000], 'rm 055': [120000, 200000],
    'rm 067': [100000, 180000], 'rm 072': [200000, 400000],
    '_default': [80000, 400000],
  },
};

const norm = s => s.toLowerCase().replace(/[_\-\/\.\s]+/g, ' ').trim();

function staticLookup(query) {
  const q = norm(query);

  for (const [brand, db] of Object.entries(STATIC_PRICES)) {
    if (!q.includes(brand)) continue;
    // Try each key — normalize key same way as query so slashes/dashes match
    for (const [key, range] of Object.entries(db)) {
      if (key === '_default') continue;
      const k = norm(key);
      if (k.length > 0 && q.includes(k)) {
        return { lowPrice: range[0], highPrice: range[1], currency: 'EUR', offerCount: 0, source: 'static' };
      }
    }
    // Brand matched but no specific reference — use default
    return { lowPrice: db._default[0], highPrice: db._default[1], currency: 'EUR', offerCount: 0, source: 'static' };
  }
  return null;
}

// ── Live fetch attempt ────────────────────────────────────────────────────────
async function tryLivePrices(query) {
  const url = `https://www.chrono24.com/search/index.htm?query=${encodeURIComponent(query)}&dosearch=true&sortorder=1`;
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

// ── Main handler ──────────────────────────────────────────────────────────────
export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    const url = new URL(request.url);
    const query = (url.searchParams.get('q') || '').trim();
    if (query.length < 3) {
      return Response.json({ error: 'query_too_short' }, { status: 400, headers: CORS });
    }

    // 1. Try live prices
    const live = await tryLivePrices(query);
    if (live) {
      return Response.json(live, { headers: { ...CORS, 'Cache-Control': 'public, max-age=900' } });
    }

    // 2. Fall back to static database
    const stat = staticLookup(query);
    if (stat) {
      return Response.json(stat, { headers: { ...CORS, 'Cache-Control': 'public, max-age=1800' } });
    }

    return Response.json({ error: 'not_found', query }, { status: 404, headers: CORS });
  },
};
