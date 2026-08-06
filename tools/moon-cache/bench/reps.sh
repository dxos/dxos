#!/usr/bin/env bash
# Repeated fully-hydrated runs against one cache, cold local cache each rep.
#
#   reps.sh <tag> <reps> [remote-host] [target]
#
# Omit remote-host to use `.moon/workspace.yml` as-is. Reports land in $OUT (default
# ./.moon-bench) as `report-<tag><n>.json`, which analyze-ab.mjs reads.
#
# The local cache MUST be cold each rep or it masks the remote path entirely; the toolchain and
# pnpm store are deliberately left warm because they are not under test.
set -uo pipefail

ROOT=$(git rev-parse --show-toplevel)
OUT="${OUT:-$ROOT/.moon-bench}"
MOON="${MOON:-$HOME/.proto/shims/moon}"

TAG="${1:?usage: reps.sh <tag> <reps> [remote-host] [target]}"
REPS="${2:?missing rep count}"
HOST="${3:-}"
TARGET="${4:-build}"

cd "$ROOT" || exit 1
mkdir -p "$OUT"

for i in $(seq 1 "$REPS"); do
  rm -rf .moon/cache/outputs .moon/cache/states .moon/cache/hashes
  if [ -n "$HOST" ]; then
    # A placeholder token, never the real one: moon skips the remote entirely when the variable is
    # absent, but any value satisfies a server with auth disabled.
    DEPOT_TOKEN=placeholder MOON_REMOTE_HOST="$HOST" "$MOON" run ":$TARGET" > "$OUT/$TAG$i.log" 2>&1
  else
    "$MOON" run ":$TARGET" > "$OUT/$TAG$i.log" 2>&1
  fi
  code=$?
  cp .moon/cache/runReport.json "$OUT/report-$TAG$i.json"
  echo "== $TAG$i exit=$code hits=$(grep -c 'cached from remote' "$OUT/$TAG$i.log")"
done
echo "== DONE — analyse with: node tools/moon-cache/bench/analyze-ab.mjs $OUT"
