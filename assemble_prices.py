#!/usr/bin/env python3
"""Read prices CSV and bulk-write to KV."""
import json, subprocess, os, sys
from datetime import datetime, timezone

NAMESPACE_ID = "37560864eed04f288995ddec3d7c0765"
WORKER_DIR = "/Users/zoomzoom/workspace/nosmontres/worker"
CSV_FILE = "/Users/zoomzoom/workspace/nosmontres/prices.csv"
OUTPUT_FILE = "/Users/zoomzoom/workspace/nosmontres/prices_bulk.json"

ts = datetime.now(timezone.utc).isoformat()

with open(CSV_FILE) as f:
    lines = [l.strip() for l in f if l.strip()]

bulk = []
for line in lines:
    parts = line.split(',')
    if len(parts) < 3:
        continue
    path, low, high = parts[0], int(parts[1]), int(parts[2])
    count = int(parts[3]) if len(parts) > 3 else 0
    bulk.append({"key": f"price:{path}", "value": json.dumps({"low": low, "high": high, "count": count, "ts": ts})})

print(f"Assembled {len(bulk)} price entries")
with open(OUTPUT_FILE, 'w') as f:
    json.dump(bulk, f)
print(f"Bulk file: {os.path.getsize(OUTPUT_FILE)} bytes")

result = subprocess.run(
    ["npx", "wrangler", "kv", "bulk", "put", OUTPUT_FILE,
     "--namespace-id", NAMESPACE_ID, "--remote"],
    cwd=WORKER_DIR, capture_output=True, text=True, timeout=120
)
if result.returncode == 0:
    print("KV bulk put SUCCESS")
    print(result.stdout[-200:] if result.stdout else '')
else:
    print(f"KV bulk put FAILED:\n{result.stderr[-300:]}")
    sys.exit(1)
