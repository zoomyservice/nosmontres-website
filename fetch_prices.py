#!/usr/bin/env python3
"""
Nosmontres price fetcher — uses Playwright to scrape European EUR price pills
from Chrono24 for all models in modelmap.json, then bulk-writes to KV.
"""
import asyncio, json, re, subprocess, sys, os
from datetime import datetime, timezone
from playwright.async_api import async_playwright

NAMESPACE_ID = "37560864eed04f288995ddec3d7c0765"
WORKER_DIR = "/Users/zoomzoom/workspace/nosmontres/worker"
MODELMAP_FILE = "/Users/zoomzoom/workspace/nosmontres/modelmap.json"
OUTPUT_FILE = "/Users/zoomzoom/workspace/nosmontres/prices_bulk.json"

EUR_PARAMS = (
    "?sortorder=1&currencyId=EUR"
    "&countryIds=DE&countryIds=FR&countryIds=CH&countryIds=IT&countryIds=ES"
    "&countryIds=AT&countryIds=NL&countryIds=BE&countryIds=PT&countryIds=GR"
    "&countryIds=PL&countryIds=SE&countryIds=DK&countryIds=NO&countryIds=FI"
    "&countryIds=IE&countryIds=LU&countryIds=MC&countryIds=LI&countryIds=UK"
    "&countryIds=BG&countryIds=CZ&countryIds=HU&countryIds=RO"
)

EXTRACT_JS = """
() => {
  const pills = [...document.querySelectorAll('.js-quick-filter-pill')];
  const pricePills = pills.map(p => p.textContent.trim()).filter(t => /[€$£]/.test(t));
  const parseAmt = t => parseInt(t.replace(/[^0-9]/g, ''));
  const values = pricePills.map(parseAmt).filter(n => n > 0).sort((a, b) => a - b);
  let count = 0;
  for (const sel of ['.js-listing-filter-info', 'h1', '[class*="result-count"]', '.result-count']) {
    const el = document.querySelector(sel);
    if (el) {
      const m = el.textContent.match(/[\\d][\\d\\s,.]*/);
      if (m) { count = parseInt(m[0].replace(/[^0-9]/g, '')); break; }
    }
  }
  return { values, count, pillTexts: pricePills };
}
"""

async def fetch_prices():
    with open(MODELMAP_FILE) as f:
        modelmap = json.load(f)

    all_models = []
    for brand, models in modelmap.items():
        for m in models:
            all_models.append((brand, m['path']))

    total = len(all_models)
    print(f"Total models to process: {total}", flush=True)

    stats = {"updated": 0, "skipped": 0, "blocked": 0, "kv_error": 0}
    prices = {}  # path -> {low, high, count, ts}
    ts_now = datetime.now(timezone.utc).isoformat()

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=['--no-sandbox', '--disable-blink-features=AutomationControlled']
        )
        ctx = await browser.new_context(
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            locale='en-US',
            viewport={'width': 1280, 'height': 800}
        )
        page = await ctx.new_page()

        for i, (brand, path) in enumerate(all_models):
            url = f"https://www.chrono24.com{path}{EUR_PARAMS}"
            try:
                await page.goto(url, wait_until='domcontentloaded', timeout=20000)
                await page.wait_for_timeout(1500)

                # Check for captcha / bot challenge
                title = await page.title()
                if 'captcha' in title.lower() or 'challenge' in title.lower() or 'just a moment' in title.lower():
                    print(f"[{i+1}/{total}] BLOCKED: {path}", flush=True)
                    stats["blocked"] += 1
                    continue

                result = await page.evaluate(EXTRACT_JS)
                values = result.get('values', [])
                count = result.get('count', 0)

                if not values:
                    print(f"[{i+1}/{total}] SKIPPED (no pills): {path}", flush=True)
                    stats["skipped"] += 1
                    continue

                prices[path] = {"low": values[0], "high": values[-1], "count": count, "ts": ts_now}
                stats["updated"] += 1
                print(f"[{i+1}/{total}] {path} → €{values[0]:,}–{values[-1]:,} ({len(values)} pills, {count} listings)", flush=True)

            except Exception as e:
                print(f"[{i+1}/{total}] ERROR: {path} — {e}", flush=True)
                stats["blocked"] += 1

        await browser.close()

    print(f"\nFetched {len(prices)} prices. Writing bulk JSON...", flush=True)

    # Build wrangler bulk format
    bulk = [{"key": f"price:{path}", "value": json.dumps(data)} for path, data in prices.items()]
    with open(OUTPUT_FILE, 'w') as f:
        json.dump(bulk, f)
    print(f"Bulk file: {OUTPUT_FILE} ({len(bulk)} entries, {os.path.getsize(OUTPUT_FILE)} bytes)", flush=True)

    # Push to KV
    print("Pushing to KV via wrangler bulk put...", flush=True)
    result = subprocess.run(
        ["npx", "wrangler", "kv", "bulk", "put", OUTPUT_FILE,
         "--namespace-id", NAMESPACE_ID, "--remote"],
        cwd=WORKER_DIR,
        capture_output=True, text=True
    )
    if result.returncode == 0:
        print("KV bulk put SUCCESS", flush=True)
    else:
        print(f"KV bulk put FAILED:\n{result.stderr}", flush=True)
        stats["kv_error"] = 1

    return stats, len(prices), total

async def main():
    stats, updated, total = await fetch_prices()
    print("\n=== PHASE 2 SUMMARY ===", flush=True)
    print(f"Updated:  {stats['updated']}/{total}", flush=True)
    print(f"Skipped:  {stats['skipped']}", flush=True)
    print(f"Blocked:  {stats['blocked']}", flush=True)
    print(f"KV error: {stats['kv_error']}", flush=True)
    # Write for log
    with open('/Users/zoomzoom/workspace/nosmontres/phase2_stats.json', 'w') as f:
        json.dump({"updated": stats["updated"], "total": total,
                   "skipped": stats["skipped"], "blocked": stats["blocked"]}, f)

asyncio.run(main())
