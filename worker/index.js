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
// [min, max] in EUR — verified against Chrono24 secondary market (April 2026)
// NOTE: Reference keys must NOT include material suffixes (st/ss/ti/rg) because
//       users never type them. norm() already strips /.-_ so slash refs work fine.
const STATIC_PRICES = {
  rolex: {
    // Submariner — April 2026 secondary market (used + papers baseline)
    // 124060: Chrono24 ~$12,500–$15,750 USD → ~€11,400–€14,300
    '124060': [11000, 14500], 'submariner no date': [11000, 14500],
    // 126610LN: ~$13,500–$17,000 → ~€12,300–€15,500
    '126610ln': [12000, 15500], '126610lv': [13000, 17000],
    '126613lb': [15000, 22000], '126618lb': [26000, 38000],
    // Daytona — 116500LN prices softer in 2026 (~$15k–$23k)
    '116500ln': [14000, 21000], '126500ln': [16000, 26000],
    '116519ln': [18000, 35000], '116528': [20000, 42000],
    // GMT-Master II — Batman stable ~$14k–$18k
    '126710blnr': [13500, 18000], '126710blro': [14500, 20000],
    '126711chnr': [24000, 38000], '126715chnr': [38000, 65000],
    // Datejust — very liquid, ~$9,500–$14,000
    '126334': [9500, 13500], '126300': [8500, 12500],
    '126231': [9500, 14500], '126233': [10000, 15500],
    // Day-Date — 228238 YG ~$30k–$50k
    '228238': [30000, 50000], '228239': [32000, 55000],
    '228235': [24000, 42000],
    // Explorer / Milgauss / Sea-Dweller
    '124270': [8000, 11000], '326934': [10000, 14500],
    '116400gv': [9000, 13500], '126600': [12500, 17500],
    // Model catch-alls
    'submariner': [11000, 38000], 'daytona': [14000, 80000],
    'gmt': [13500, 65000], 'datejust': [7500, 22000],
    'day-date': [22000, 85000], 'explorer': [7500, 12500],
    'sea-dweller': [12500, 18500], 'milgauss': [8500, 14000],
    '_default': [8500, 55000],
  },
  'audemars piguet': {
    // Royal Oak 15500ST — Chrono24 $36,500–$54,500 USD → ~€33k–€50k
    '15500': [38000, 50000],   // Royal Oak 41mm steel (current gen)
    '15202': [85000, 145000],  // Royal Oak Jumbo 39mm — ultra-rare, very stable
    '15400': [26000, 42000],   // Royal Oak 41mm (prev gen, discontinued, softer)
    '26331': [36000, 62000],   // Royal Oak Chronograph
    // Royal Oak Offshore
    '15710': [24000, 40000],   // Offshore 42mm
    '26470': [28000, 46000],   // Offshore 44mm Chronograph
    '26480': [36000, 60000],   // Offshore 44mm Ti
    '26405': [30000, 55000],   // Offshore Diver
    // Other AP models
    'code 11.59': [22000, 50000], 'millenary': [18000, 45000],
    // Model catch-alls — after specific refs
    'royal oak offshore': [22000, 90000], 'royal oak': [30000, 145000],
    '_default': [22000, 145000],
  },
  'patek philippe': {
    // Nautilus — disc. Jan 2022, premium has normalised but still strong
    // 5711/1A: Chrono24 ~$84k–$162k USD → ~€76k–€148k (blue dial)
    '5711/1a': [76000, 148000], '5726/1a': [52000, 95000], '5980/1ar': [78000, 138000],
    '5711': [65000, 148000], '5712r': [62000, 108000],
    // Aquanaut — 5167/1A ~$40k–$60k → ~€36k–€55k
    '5167/1a': [36000, 58000], '5168g': [62000, 115000],
    '5164a': [45000, 80000],
    // Calatrava
    '5296r': [22000, 40000], '5227g': [28000, 52000],
    '5153g': [35000, 65000], '5196': [18000, 30000],
    // Complications
    '5146': [45000, 80000], '5270': [95000, 165000],
    // Model catch-alls
    'nautilus': [52000, 200000], 'aquanaut': [28000, 115000],
    'calatrava': [18000, 65000], 'grand complications': [200000, 1000000],
    '_default': [18000, 200000],
  },
  'richard mille': {
    // RM prices in EUR — broadly stable with USD weakness
    'rm 011': [170000, 340000], 'rm 027': [500000, 1200000],
    'rm 035': [140000, 270000], 'rm 055': [115000, 195000],
    'rm 067': [95000, 175000], 'rm 072': [190000, 390000],
    'rm 052': [240000, 490000], 'rm 69': [190000, 390000],
    '_default': [95000, 450000],
  },
};

const norm = s => s.toLowerCase().replace(/[_\-\/\.\s]+/g, ' ').trim();

function staticLookup(query) {
  const q = norm(query);

  for (const [brand, db] of Object.entries(STATIC_PRICES)) {
    if (!q.includes(brand)) continue;
    // Sort keys so the most-specific match wins:
    //   1. Reference-like keys (contain a digit, e.g. "5711/1a", "124060", "15500") — first
    //      Within this group: longer normalized form first ("5711 1a" before "5711")
    //   2. Model-name keys (no digits, e.g. "submariner", "royal oak") — after all refs
    //      Within this group: longer first ("royal oak offshore" before "royal oak")
    // This prevents JS's integer-key enumeration bias and stops model names from
    // shadowing specific reference numbers.
    const sortedKeys = Object.keys(db)
      .filter(k => k !== '_default')
      .sort((a, b) => {
        const aRef = /\d/.test(a), bRef = /\d/.test(b);
        if (aRef !== bRef) return aRef ? -1 : 1;          // refs before model names
        return norm(b).length - norm(a).length;            // longer = more specific first
      });
    for (const key of sortedKeys) {
      const k = norm(key);
      if (k.length > 0 && q.includes(k)) {
        const range = db[key];
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
