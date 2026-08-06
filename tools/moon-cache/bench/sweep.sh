#!/usr/bin/env bash
# Latency sweep against a cache, through the userspace delay proxy. Predicts how a cache would
# behave at a different RTT — the same server plus N ms.
#
#   RTTS="0 2 5 10 20 40" REPS=3 TARGET=build sweep.sh [upstream-port]
#
# Only the SLOPE across RTTs is guaranteed meaningful; the proxy's own cost inflates the RTT=0
# absolute on constrained machines (it was ~4x on a small container, negligible on a dev laptop).
set -uo pipefail

ROOT=$(git rev-parse --show-toplevel)
OUT="${OUT:-$ROOT/.moon-bench}"
MOON="${MOON:-$HOME/.proto/shims/moon}"
HERE=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)

UPSTREAM="${1:-9092}"
PROXY_PORT="${PROXY_PORT:-9192}"
TARGET="${TARGET:-build}"
REPS="${REPS:-3}"
RTTS="${RTTS:-0 2 5 10 20 40}"

cd "$ROOT" || exit 1
mkdir -p "$OUT"

for rtt in $RTTS; do
  node "$HERE/delay-proxy.mjs" "$PROXY_PORT" "$UPSTREAM" "$rtt" 2>"$OUT/proxy-$rtt.log" &
  proxy=$!
  sleep 1
  for i in $(seq 1 "$REPS"); do
    rm -rf .moon/cache/outputs .moon/cache/states .moon/cache/hashes
    DEPOT_TOKEN=placeholder MOON_REMOTE_HOST="grpc://127.0.0.1:$PROXY_PORT" \
      "$MOON" run ":$TARGET" > "$OUT/sweep-$rtt-$i.log" 2>&1
    cp .moon/cache/runReport.json "$OUT/sweep-report-$rtt-$i.json"
    echo "== rtt=${rtt}ms rep=$i hits=$(grep -c 'cached from remote' "$OUT/sweep-$rtt-$i.log")"
  done
  kill "$proxy" 2>/dev/null
  sleep 1
done
echo "== DONE — analyse with: node tools/moon-cache/bench/analyze-sweep.mjs $OUT"
