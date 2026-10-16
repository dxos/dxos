#!/usr/bin/env bash
# Records one take of a flow headless, prints each step's result, and leaves session.webm + timeline.json in <out>.
# usage: run.sh <flow.mjs> <out-dir> [port]
set -uo pipefail
ROOT=$(git -C "$(dirname "$0")" rev-parse --show-toplevel)
FLOW=$1
OUT=$2
PORT=${3:-7337}
rm -rf "$OUT" && mkdir -p "$OUT"
SHOWCASE_BATCH=${BATCH:-one,mermaid,two,three} node "$ROOT/.agents/skills/autocue/scripts/driver.mjs" --port "$PORT" --url http://localhost:4173 --out "$OUT" \
  --width 1920 --height 1080 --scale 2 --overlay off --gpu on --theme light --fps 60 --captions off --ready-timeout 180000 > "$OUT/driver.log" 2>&1 &
DRIVER=$!
until [ -f "$OUT/token" ]; do
  kill -0 "$DRIVER" 2>/dev/null || { echo "driver exited:"; tail -5 "$OUT/driver.log"; exit 1; }
  sleep 1
done
TOKEN=$(cat "$OUT/token")
cmd() { curl -sS -H "x-demo-token: $TOKEN" "localhost:$PORT/cmd" -d "$1"; echo; }
cmd '{"op":"goto"}' | cut -c1-120
cmd "{\"op\":\"steps\",\"file\":\"$FLOW\"}" > /dev/null
cmd '{"op":"run","countdown":false,"pace":0}' | python3 -c "
import json, sys
d = json.load(sys.stdin)
for s in d.get('steps', []):
    print(s['step'], 'ok ' if s['ok'] else 'ERR', s['name'], (s.get('error') or '').split(chr(10))[0][:140])
if d.get('error'): print('error:', d['error'][:300])
"
cmd '{"op":"stop"}' | cut -c1-160
grep '\[showcase\]' "$OUT/driver.log" | cut -c1-240
