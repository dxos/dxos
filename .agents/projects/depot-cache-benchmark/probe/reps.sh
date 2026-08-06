#!/usr/bin/env bash
# Repeated fully-hydrated runs against one arm, cold local cache per rep.
# Usage: reps.sh <tag> <reps> [MOON_REMOTE_HOST]   (omit host to use .moon/workspace.yml, i.e. Depot)
set -uo pipefail

REPO=/Users/jdw/.ccmanager/dxos/depot-vs-self-hosted-cache-3fbd62
SP=/private/tmp/claude-501/-Users-jdw--ccmanager-dxos-depot-vs-self-hosted-cache-3fbd62/e17cc85c-9b5f-435a-9809-484f24754726/scratchpad
MOON=$HOME/.proto/shims/moon
TAG="$1"
REPS="$2"
HOST="${3:-}"
TARGET="${4:-build}"

cd "$REPO" || exit 1

for i in $(seq 1 "$REPS"); do
  rm -rf .moon/cache/outputs .moon/cache/states .moon/cache/hashes
  if [ -n "$HOST" ]; then
    DEPOT_TOKEN="${DEPOT_TOKEN:-anything}" MOON_REMOTE_HOST="$HOST" "$MOON" run ":$TARGET" > "$SP/s2-$TAG$i.log" 2>&1
  else
    "$MOON" run ":$TARGET" > "$SP/s2-$TAG$i.log" 2>&1
  fi
  cp .moon/cache/runReport.json "$SP/s2-report-$TAG$i.json"
  echo "== $TAG$i done exit=$? hits=$(grep -c 'cached from remote' "$SP/s2-$TAG$i.log")"
done
echo "== DONE"
