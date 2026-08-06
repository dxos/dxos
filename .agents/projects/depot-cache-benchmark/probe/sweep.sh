#!/usr/bin/env bash
# Latency sweep against the loopback bazel-remote through the userspace delay proxy.
# Predicts a remote (droplet) bazel-remote arm: same server, plus RTT.
# Only the SLOPE across RTTs is meaningful — the proxy inflates the RTT=0 absolute.
set -uo pipefail

REPO=/Users/jdw/.ccmanager/dxos/depot-vs-self-hosted-cache-3fbd62
SP=/private/tmp/claude-501/-Users-jdw--ccmanager-dxos-depot-vs-self-hosted-cache-3fbd62/e17cc85c-9b5f-435a-9809-484f24754726/scratchpad
PROBE=$REPO/.agents/projects/depot-cache-benchmark/probe
MOON=$HOME/.proto/shims/moon
TARGET="${TARGET:-build}"
REPS="${REPS:-3}"
RTTS="${RTTS:-0 2 5 10 20 40}"

cd "$REPO" || exit 1

for rtt in $RTTS; do
  node "$PROBE/delay-proxy.mjs" 9192 9092 "$rtt" 2>"$SP/proxy-$rtt.log" &
  proxy=$!
  sleep 1
  for i in $(seq 1 "$REPS"); do
    rm -rf .moon/cache/outputs .moon/cache/states .moon/cache/hashes
    DEPOT_TOKEN=anything MOON_REMOTE_HOST='grpc://127.0.0.1:9192' \
      "$MOON" run ":$TARGET" > "$SP/sweep-$rtt-$i.log" 2>&1
    cp .moon/cache/runReport.json "$SP/sweep-report-$rtt-$i.json"
    echo "== rtt=${rtt}ms rep=$i hits=$(grep -c 'cached from remote' "$SP/sweep-$rtt-$i.log")"
  done
  kill "$proxy" 2>/dev/null
  sleep 1
done
echo "== DONE"
