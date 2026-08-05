#!/usr/bin/env bash
# Phase 0 latency-sensitivity probe: hydrate the same targets from a local
# bazel-remote at several simulated RTTs and record the hydration cost.
set -euo pipefail

S="${S:-$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)}"
REPO="${REPO:-$(git rev-parse --show-toplevel)}"
TARGET="${TARGET:-log:build}"
RTTS="${RTTS:-0 5 10 20}"
REPS="${REPS:-3}"

mkdir -p "$S/results"
echo "rtt_ms,rep,wall_ms,hydration_ms,hydration_ops,hash_gen_ms" > "$S/results/latency-sweep.csv"

for rtt in $RTTS; do
  node "$S/delay-proxy.mjs" 9192 9092 "$rtt" 2>/dev/null &
  proxy=$!
  sleep 1
  for rep in $(seq 1 "$REPS"); do
    rm -rf "$REPO/.moon/cache/outputs" "$REPO/.moon/cache/states" "$REPO/.moon/cache/hashes"
    start=$(date +%s%N)
    DEPOT_TOKEN='local-bench-dummy' MOON_REMOTE_HOST='grpc://127.0.0.1:9192' \
      "$REPO/node_modules/.bin/moon" run "$TARGET" --quiet >/dev/null 2>&1 || true
    wall=$(( ($(date +%s%N) - start) / 1000000 ))
    node -e '
      const r = require(process.argv[1]);
      let hyd = 0, ops = 0, hash = 0;
      for (const a of r.actions) for (const o of a.operations ?? []) {
        const ms = (o.duration?.secs ?? 0) * 1000 + (o.duration?.nanos ?? 0) / 1e6;
        if (o.meta?.type === "output-hydration" && o.status === "cached-from-remote") { hyd += ms; ops++; }
        if (o.meta?.type === "hash-generation") hash += ms;
      }
      console.log([process.argv[2], process.argv[3], process.argv[4], hyd.toFixed(1), ops, hash.toFixed(1)].join(","));
    ' "$REPO/.moon/cache/runReport.json" "$rtt" "$rep" "$wall" >> "$S/results/latency-sweep.csv"
  done
  kill $proxy 2>/dev/null || true
  wait $proxy 2>/dev/null || true
done

column -s, -t < "$S/results/latency-sweep.csv"
