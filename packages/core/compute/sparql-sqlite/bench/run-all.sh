#!/usr/bin/env bash
#
# Copyright 2026 DXOS.org
#
# Runs every real-dataset query set against the deployed worker, without and with the engine's selectivity
# hints, writing bench/.cache/results/q-<db>-h<0|1>.json. Datasets must already be loaded (real.mjs load).
#   bench/run-all.sh <expected BUILD stamp> [db:queries ...]

set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
DATA="$HERE/.cache/data"
OUT="$HERE/.cache/results"
BUILD="$1"
shift
SETS=("$@")
if [ ${#SETS[@]} -eq 0 ]; then
  SETS=(lubm10:lubm10 lubm10rdfs:lubm10 watdiv10:watdiv10 bsbm1m:bsbm-2785 dblp6m:dblp-6m watdiv50:watdiv50 bsbm5m:bsbm-14000)
fi
for set in "${SETS[@]}"; do
  db="${set%%:*}"
  queries="${set##*:}"
  for hints in 0 1; do
    node --experimental-strip-types --no-warnings "$HERE/real.mjs" query --db "$db" --queries "$DATA/$queries.queries.json" \
      --prefix --hints "$hints" --expect-build "$BUILD" --out "$OUT/q-$db-h$hints.json" > "$OUT/q-$db-h$hints.log" 2>&1
  done
done
