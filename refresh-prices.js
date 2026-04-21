#!/usr/bin/env node
/**
 * refresh-prices.js — Nosmontres daily price refresh
 *
 * Launches headless Chrome via Playwright, visits each Chrono24 model page,
 * extracts AggregateOffer JSON-LD prices, and writes them into Cloudflare
 * Workers KV so the worker can serve live prices instead of the static DB.
 *
 * Run manually:   node /Users/zoomzoom/workspace/nosmontres/refresh-prices.js
 * Run via cron:   scheduled-tasks handles this automatically at 3 AM daily
 *
 * Prerequisites (one-time):
 *   cd /Users/zoomzoom/workspace/nosmontres && npm install playwright
 *   npx playwright install chromium
 */

const { execSync } = require('child_process');
const path = require('path');

// ── Config ─────────────────────────────────────────────────────────────────────
const KV_NAMESPACE_ID = '37560864eed04f288995ddec3d7c0765';
const WRANGLER_DIR    = '/Users/zoomzoom/workspace/nosmontres/worker';
const DELAY_MS        = 2500; // polite delay between pages (ms)

// ── All model pages to refresh ─────────────────────────────────────────────────
// Key = the exact KV key stored (prefix "price:" + chrono24 path)
// Value = Chrono24 model page path
const MODELS = [
  // Rolex
  ['/rolex/submariner--mod1.htm',         'Rolex Submariner'],
  ['/rolex/gmt-master-ii--mod4.htm',      'Rolex GMT-Master II'],
  ['/rolex/gmt-master--mod3.htm',         'Rolex GMT-Master'],
  ['/rolex/daytona--mod2.htm',            'Rolex Daytona'],
  ['/rolex/datejust-41--mod3025.htm',     'Rolex Datejust 41'],
  ['/rolex/datejust-36--mod2787.htm',     'Rolex Datejust 36'],
  ['/rolex/datejust--mod45.htm',          'Rolex Datejust'],
  ['/rolex/day-date--mod47.htm',          'Rolex Day-Date'],
  ['/rolex/explorer--mod50.htm',          'Rolex Explorer'],
  ['/rolex/explorer-ii--mod51.htm',       'Rolex Explorer II'],
  ['/rolex/sea-dweller--mod49.htm',       'Rolex Sea-Dweller'],
  ['/rolex/yacht-master--mod58.htm',      'Rolex Yacht-Master'],
  ['/rolex/milgauss--mod54.htm',          'Rolex Milgauss'],
  ['/rolex/air-king--mod5.htm',           'Rolex Air-King'],
  ['/rolex/oyster-perpetual--mod55.htm',  'Rolex Oyster Perpetual'],
  // Audemars Piguet
  ['/audemarspiguet/royal-oak--mod116.htm',             'AP Royal Oak'],
  ['/audemarspiguet/royal-oak-offshore--mod117.htm',    'AP Royal Oak Offshore'],
  ['/audemarspiguet/royal-oak-chronograph--mod1170.htm','AP Royal Oak Chronograph'],
  ['/audemarspiguet/code-1159--mod2734.htm',            'AP Code 11.59'],
  ['/audemarspiguet/millenary--mod114.htm',             'AP Millenary'],
  ['/audemarspiguet/jules-audemars--mod112.htm',        'AP Jules Audemars'],
  // Patek Philippe
  ['/patekphilippe/nautilus--mod106.htm',          'Patek Nautilus'],
  ['/patekphilippe/aquanaut--mod92.htm',           'Patek Aquanaut'],
  ['/patekphilippe/calatrava--mod93.htm',          'Patek Calatrava'],
  ['/patekphilippe/complications--mod96.htm',      'Patek Complications'],
  ['/patekphilippe/grand-complications--mod101.htm','Patek Grand Complications'],
  ['/patekphilippe/gondolo--mod98.htm',            'Patek Gondolo'],
  ['/patekphilippe/twenty4--mod109.htm',           'Patek Twenty~4'],
  ['/patekphilippe/chronograph--mod1964.htm',      'Patek Chronograph'],
  // Richard Mille
  ['/richardmille/rm-011--mod880.htm',  'RM 011'],
  ['/richardmille/rm-027--mod1443.htm', 'RM 027'],
  ['/richardmille/rm-035--mod1447.htm', 'RM 035'],
  ['/richardmille/rm-052--mod1448.htm', 'RM 052'],
  ['/richardmille/rm-055--mod1449.htm', 'RM 055'],
  ['/richardmille/rm-67--mod2903.htm',  'RM 067'],
  ['/richardmille/rm-69--mod2958.htm',  'RM 069/072'],
  // Cartier
  ['/cartier/santos--mod180.htm',              'Cartier Santos'],
  ['/cartier/tank--mod186.htm',                'Cartier Tank'],
  ['/cartier/ballon-bleu--mod165.htm',         'Cartier Ballon Bleu'],
  ['/cartier/panthere--mod168.htm',            'Cartier Panthère'],
  ['/cartier/drive-de-cartier--mod2437.htm',   'Cartier Drive'],
  ['/cartier/ronde-de-cartier--mod2523.htm',   'Cartier Ronde'],
  ['/cartier/calibre-de-cartier--mod166.htm',  'Cartier Calibre'],
];

// ── Helpers ────────────────────────────────────────────────────────────────────
function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function extractPrice(page) {
  return page.evaluate(() => {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const s of scripts) {
      try {
        const d = JSON.parse(s.textContent);
        const graph = d['@graph'] || [d];
        const agg = graph.find(n => n['@type'] === 'AggregateOffer');
        if (agg && agg.lowPrice) {
          return {
            low:   parseFloat(agg.lowPrice),
            high:  parseFloat(agg.highPrice),
            count: parseInt(agg.offerCount || 0),
          };
        }
      } catch (_) {}
    }
    return null;
  });
}

function writeToKV(kvKey, value) {
  const json = JSON.stringify(value).replace(/'/g, "\\'");
  const cmd  = `cd "${WRANGLER_DIR}" && npx wrangler kv key put "${kvKey}" '${json}' --namespace-id=${KV_NAMESPACE_ID}`;
  execSync(cmd, { stdio: 'pipe' });
}

function formatEur(n) {
  return '€' + Math.round(n).toLocaleString('fr-FR');
}

// ── Main ───────────────────────────────────────────────────────────────────────
async function main() {
  let chromium, stealth;
  try {
    const { chromium: pwChromium } = require('playwright-extra');
    stealth = require('puppeteer-extra-plugin-stealth');
    pwChromium.use(stealth());
    chromium = pwChromium;
  } catch {
    // Fallback to plain playwright if playwright-extra not available
    try {
      ({ chromium } = require('playwright'));
    } catch {
      console.error('Playwright not installed. Run:\n  cd /Users/zoomzoom/workspace/nosmontres && npm install playwright playwright-extra puppeteer-extra-plugin-stealth && npx playwright install chromium');
      process.exit(1);
    }
  }

  console.log(`\n🕒  Nosmontres price refresh — ${new Date().toLocaleString('fr-FR')}`);
  console.log(`📋  ${MODELS.length} model pages to refresh\n`);

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-features=IsolateOrigins,site-per-process',
    ],
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    locale: 'fr-FR',
    extraHTTPHeaders: {
      'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
      'sec-ch-ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"macOS"',
    },
  });

  const page = await context.newPage();

  let updated = 0;
  let failed  = 0;

  for (const [modelPath, label] of MODELS) {
    const url    = `https://www.chrono24.com${modelPath}?sortorder=1&currencyId=EUR`;
    const kvKey  = `price:${modelPath}`;

    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      const price = await extractPrice(page);

      if (price && price.low > 0) {
        const record = { low: price.low, high: price.high, count: price.count, ts: new Date().toISOString() };
        writeToKV(kvKey, record);
        console.log(`  ✅  ${label.padEnd(30)} ${formatEur(price.low)} – ${formatEur(price.high)}  (${price.count} listings)`);
        updated++;
      } else {
        console.log(`  ⚠️   ${label.padEnd(30)} no price data found`);
        failed++;
      }
    } catch (err) {
      console.log(`  ❌  ${label.padEnd(30)} ${err.message.split('\n')[0]}`);
      failed++;
    }

    await sleep(DELAY_MS);
  }

  await browser.close();

  console.log(`\n✨  Done — ${updated} updated, ${failed} failed`);
  console.log(`    Prices live in KV, worker will serve them for up to 48 hours.\n`);

  if (failed > 0) process.exit(1); // non-zero exit so scheduled task can flag failures
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
