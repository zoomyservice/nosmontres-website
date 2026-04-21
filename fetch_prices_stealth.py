#!/usr/bin/env python3
"""
Nosmontres price fetcher with stealth mode to bypass Cloudflare bot detection.
"""
import asyncio, json, re, subprocess, sys, os
from datetime import datetime, timezone

NAMESPACE_ID = "37560864eed04f288995ddec3d7c0765"
WORKER_DIR = "/Users/zoomzoom/workspace/nosmontres/worker"
MODELMAP_FILE = "/Users/zoomzoom/workspace/nosmontres/modelmap.json"
OUTPUT_FILE = "/Users/zoomzoom/workspace/nosmontres/prices_bulk.json"
LOG_FILE = "/Users/zoomzoom/workspace/nosmontres/fetch_prices.log"

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
  const title = document.title;
  const blocked = title.toLowerCase().includes('captcha') || 
                  title.toLowerCase().includes('just a moment') ||
                  title.toLowerCase().includes('challenge');
  return { values, count, pillTexts: pricePills, title, blocked };
}
"""

def log(msg):
    print(msg, flush=True)
    with open(LOG_FILE, 'a') as f:
        f.write(msg + '\n')

async def fetch_prices():
    from camoufox.async_api import AsyncCamoufox

    with open(MODELMAP_FILE) as f:
        modelmap = json.load(f)

    all_models = []
    for brand, models in modelmap.items():
        for m in models:
            all_models.append((brand, m['path']))

    total = len(all_models)
    log(f"Total models to process: {total}")
    log(f"Started: {datetime.now().isoformat()}")

    stats = {"updated": 0, "skipped": 0, "blocked": 0, "kv_error": 0}
    prices = {}
    ts_now = datetime.now(timezone.utc).isoformat()

    async with AsyncCamoufox(headless=True, geoip=True) as browser:
        page = await browser.new_page()

        # Prime the browser with a visit to chrono24 first
        log("Priming browser with initial chrono24 visit...")
        try:
            await page.goto("https://www.chrono24.com/rolex/index.htm",
                           wait_until='domcontentloaded', timeout=25000)
            await page.wait_for_timeout(3000)
            title = await page.title()
            log(f"Prime page title: {title}")
        except Exception as e:
            log(f"Prime failed: {e}")

        for i, (brand, path) in enumerate(all_models):
            url = f"https://www.chrono24.com{path}{EUR_PARAMS}"
            try:
                await page.goto(url, wait_until='domcontentloaded', timeout=25000)
                await page.wait_for_timeout(2000)

                result = await page.evaluate(EXTRACT_JS)
                values = result.get('values', [])
                count = result.get('count', 0)
                title = result.get('title', '')
                blocked = result.get('blocked', False)

                if blocked:
                    log(f"[{i+1}/{total}] BLOCKED: {path} (title: {title[:40]})")
                    stats["blocked"] += 1
                    await page.wait_for_timeout(3000)
                    continue

                if not values:
                    log(f"[{i+1}/{total}] SKIPPED: {path} (title: {title[:40]})")
                    stats["skipped"] += 1
                    continue

                prices[path] = {"low": values[0], "high": values[-1], "count": count, "ts": ts_now}
                stats["updated"] += 1
                log(f"[{i+1}/{total}] OK: {path} → €{values[0]:,}–{values[-1]:,} ({count} listings)")

            except Exception as e:
                log(f"[{i+1}/{total}] ERROR: {path} — {str(e)[:80]}")
                stats["blocked"] += 1

        await page.close()

    log(f"\nFetched {len(prices)} prices. Writing bulk JSON...")

    bulk = [{"key": f"price:{path}", "value": json.dumps(data)} for path, data in prices.items()]
    with open(OUTPUT_FILE, 'w') as f:
        json.dump(bulk, f)
    log(f"Bulk file: {len(bulk)} entries, {os.path.getsize(OUTPUT_FILE)} bytes")

    if bulk:
        log("Pushing to KV via wrangler bulk put...")
        result = subprocess.run(
            ["npx", "wrangler", "kv", "bulk", "put", OUTPUT_FILE,
             "--namespace-id", NAMESPACE_ID, "--remote"],
            cwd=WORKER_DIR, capture_output=True, text=True, timeout=120
        )
        if result.returncode == 0:
            log("KV bulk put SUCCESS")
        else:
            log(f"KV bulk put FAILED: {result.stderr[:200]}")
            stats["kv_error"] = 1
    else:
        log("No prices to write (all blocked/skipped)")

    return stats, len(prices), total

async def main():
    # Clear log
    with open(LOG_FILE, 'w') as f:
        f.write('')

    stats, updated, total = await fetch_prices()
    log("\n=== PHASE 2 SUMMARY ===")
    log(f"Updated:  {stats['updated']}/{total}")
    log(f"Skipped:  {stats['skipped']}")
    log(f"Blocked:  {stats['blocked']}")
    log(f"KV error: {stats['kv_error']}")
    log(f"Finished: {datetime.now().isoformat()}")

    with open('/Users/zoomzoom/workspace/nosmontres/phase2_stats.json', 'w') as f:
        json.dump({"updated": stats["updated"], "total": total,
                   "skipped": stats["skipped"], "blocked": stats["blocked"]}, f)

asyncio.run(main())
