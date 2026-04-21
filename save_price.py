#!/usr/bin/env python3
import json, sys
path, low, high, count = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4])
from datetime import datetime, timezone
ts = datetime.now(timezone.utc).isoformat()
data = json.load(open('/Users/zoomzoom/workspace/nosmontres/price_results.json'))
data[path] = {"low": low, "high": high, "count": count, "ts": ts}
json.dump(data, open('/Users/zoomzoom/workspace/nosmontres/price_results.json','w'))
print(f"saved {path} low={low} high={high}")
