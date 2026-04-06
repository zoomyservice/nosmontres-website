/**
 * Nos Montres — Live Price Worker
 * Fetches Chrono24 and extracts JSON-LD AggregateOffer price data
 * Deploy: https://developers.cloudflare.com/workers/
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

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

    // Use chrono24.fr for EUR prices
    const c24 = `https://www.chrono24.fr/search/index.htm?query=${encodeURIComponent(query)}&dosearch=true&sortorder=1`;

    let resp;
    try {
      resp = await fetch(c24, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
          'Accept-Encoding': 'gzip, deflate, br',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
          'Upgrade-Insecure-Requests': '1',
        },
        redirect: 'follow',
      });
    } catch (err) {
      return Response.json({ error: 'fetch_failed', detail: err.message }, { status: 502, headers: CORS });
    }

    if (!resp.ok) {
      return Response.json({ error: `upstream_${resp.status}` }, { status: 502, headers: CORS });
    }

    const html = await resp.text();

    // Extract JSON-LD structured data (present in initial HTML for SEO)
    const match = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i);
    if (!match) {
      return Response.json({ error: 'no_ld_json', htmlLen: html.length }, { status: 404, headers: CORS });
    }

    let parsed;
    try { parsed = JSON.parse(match[1]); }
    catch (e) { return Response.json({ error: 'json_parse_failed' }, { status: 500, headers: CORS }); }

    const graph = parsed['@graph'] || [parsed];
    const agg = graph.find(n => n['@type'] === 'AggregateOffer');

    if (!agg) {
      return Response.json({ error: 'no_aggregate_offer' }, { status: 404, headers: CORS });
    }

    return Response.json({
      lowPrice: parseFloat(agg.lowPrice),
      highPrice: parseFloat(agg.highPrice),
      currency: agg.priceCurrency || 'EUR',
      offerCount: parseInt(agg.offerCount || 0),
    }, {
      headers: { ...CORS, 'Cache-Control': 'public, max-age=900' },
    });
  },
};
