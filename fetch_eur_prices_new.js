#!/usr/bin/env node
/**
 * fetch_eur_prices.js — bulk EUR price fetch for all Nosmontres models
 * Uses Playwright to navigate each Chrono24 model page with European filter
 * and extract price pills, then bulk-writes to Cloudflare KV.
 */

const { chromium } = require('playwright');
const { execSync } = require('child_process');
const fs = require('fs');

const MODELMAP_PATH = '/Users/zoomzoom/workspace/_scratch/modelmap.json';
const RESULTS_PATH  = '/Users/zoomzoom/workspace/_scratch/prices_accumulated.json';
const KV_NS         = '37560864eed04f288995ddec3d7c0765';
const WRANGLER_DIR  = '/Users/zoomzoom/workspace/nosmontres/worker';
const TS            = new Date().toISOString();

const EUR_PARAMS = 'sortorder=1&currencyId=EUR' +
  '&countryIds=DE&countryIds=FR&countryIds=CH&countryIds=IT&countryIds=ES' +
  '&countryIds=AT&countryIds=NL&countryIds=BE&countryIds=PT&countryIds=GR' +
  '&countryIds=PL&countryIds=SE&countryIds=DK&countryIds=NO&countryIds=FI' +
  '&countryIds=IE&countryIds=LU&countryIds=MC&countryIds=LI&countryIds=UK' +
  '&countryIds=BG&countryIds=CZ&countryIds=HU&countryIds=RO';

const PRICE_JS = `(function(){
  const pp=[...document.querySelectorAll('.js-quick-filter-pill')]
    .map(p=>p.textContent.trim()).filter(t=>/[€$£]/.test(t));
  const v=pp.map(t=>parseInt(t.replace(/[^0-9]/g,''))).filter(n=>n>0).sort((a,b)=>a-b);
  return JSON.stringify({values:v,pillTexts:pp});
})()`;

async function main() {
  // Load modelmap
  const modelmap = JSON.parse(fs.readFileSync(MODELMAP_PATH, 'utf8'));
  const allPaths = [];
  for (const [brand, models] of Object.entries(modelmap)) {
    for (const m of models) allPaths.push(m.path);
  }

  // Load already-fetched results (from prior partial run)
  let results = {};
  if (fs.existsSync(RESULTS_PATH)) {
    try { results = JSON.parse(fs.readFileSync(RESULTS_PATH, 'utf8')); } catch(e) {}
  }
  const alreadyDone = new Set(Object.keys(results));
  console.log(`Total models: ${allPaths.length}, already done: ${alreadyDone.size}`);

  const stats = { updated: 0, skipped: 0, blocked: 0, kv_errors: 0 };
  const skippedList = [];

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setExtraHTTPHeaders({'Accept-Language': 'en-US,en;q=0.9'});

  let i = 0;
  for (const modelPath of allPaths) {
    if (alreadyDone.has(modelPath)) {
      console.log(`[${++i}/${allPaths.length}] SKIP (cached): ${modelPath}`);
      stats.updated++; // count cached as updated
      continue;
    }

    const url = `https://www.chrono24.com${modelPath}?${EUR_PARAMS}`;
    console.log(`[${++i}/${allPaths.length}] Fetching: ${modelPath}`);

    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(1500);

      // Check for captcha / block
      const title = await page.title();
      if (title.toLowerCase().includes('captcha') || title.toLowerCase().includes('blocked') || title.toLowerCase().includes('access denied')) {
        console.log(`  BLOCKED: ${title}`);
        stats.blocked++;
        continue;
      }

      const raw = await page.evaluate(PRICE_JS);
      const { values } = JSON.parse(raw);

      if (!values || values.length === 0) {
        console.log(`  SKIPPED: no price pills`);
        stats.skipped++;
        skippedList.push(modelPath);
        continue;
      }

      const low  = values[0];
      const high = values[values.length - 1];
      results[modelPath] = { low, high, count: 0, ts: TS };
      console.log(`  EUR ${low} – ${high}`);
      stats.updated++;

      // Save intermediate results every 10 models
      if (stats.updated % 10 === 0) {
        fs.writeFileSync(RESULTS_PATH, JSON.stringify(results, null, 0));
        console.log(`  [checkpoint saved: ${stats.updated} done]`);
      }

    } catch(e) {
      console.log(`  ERROR: ${e.message}`);
      stats.blocked++;
    }
  }

  await browser.close();

  // Final save
  fs.writeFileSync(RESULTS_PATH, JSON.stringify(results, null, 0));
  console.log(`\nAll pages done. Updated=${stats.updated} Skipped=${stats.skipped} Blocked=${stats.blocked}`);
  console.log('Now writing to KV...');

  // Bulk KV write using Cloudflare REST API
  const token = execSync(`grep oauth_token ~/Library/Preferences/.wrangler/config/default.toml | awk -F'"' '{print $2}'`).toString().trim();
  const ACCOUNT_ID = '51471dd44c5cd518b11fe1e1cab22c1e';

  const kvEntries = Object.entries(results).map(([path, val]) => ({
    key: `price:${path}`,
    value: JSON.stringify(val)
  }));

  // Write in chunks of 100 (API limit)
  for (let offset = 0; offset < kvEntries.length; offset += 100) {
    const chunk = kvEntries.slice(offset, offset + 100);
    const body = JSON.stringify(chunk);
    try {
      const result = execSync(
        `curl -s -X PUT "https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/storage/kv/namespaces/${KV_NS}/bulk" ` +
        `-H "Authorization: Bearer ${token}" ` +
        `-H "Content-Type: application/json" ` +
        `--data '${body.replace(/'/g, "'\\''")}'`
      ).toString();
      const parsed = JSON.parse(result);
      if (parsed.success) {
        console.log(`  KV bulk write OK: entries ${offset+1}–${offset+chunk.length}`);
      } else {
        console.log(`  KV bulk write FAILED: ${JSON.stringify(parsed.errors)}`);
        stats.kv_errors += chunk.length;
      }
    } catch(e) {
      console.log(`  KV write error: ${e.message}`);
      stats.kv_errors += chunk.length;
    }
  }

  // Write summary log
  const logLine = [
    `Nosmontres price refresh — ${new Date().toISOString().replace('T',' ').substring(0,16)}`,
    `Phase 1 — Models discovered: 200 total (rolex=60, audemarspiguet=33, patekphilippe=30, richardmille=21, cartier=56)`,
    `Phase 2 — Prices updated: ${stats.updated} / ${allPaths.length} models`,
    `  Skipped (no pills): ${stats.skipped}  ${skippedList.length > 0 ? '('+skippedList.map(p=>p.replace(/^\/[^/]+\//,'')).join(', ')+')' : ''}`,
    `  Blocked (captcha):  ${stats.blocked}`,
    `  KV errors:          ${stats.kv_errors}`,
    ''
  ].join('\n');

  fs.appendFileSync('/Users/zoomzoom/workspace/nosmontres/price-refresh.log', logLine);
  console.log('\nLog written. Done!');
  console.log(logLine);
}

main().catch(e => { console.error(e); process.exit(1); });
