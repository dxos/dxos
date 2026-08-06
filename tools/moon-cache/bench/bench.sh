#!/usr/bin/env bash
# Time repeated fully-hydrated moon runs against one cache.
#
#   bench.sh <arm> <reps> [remote-host] [target]
#
# <arm> is a short label; reports land in .moon-bench/report-<arm><n>.json for analyze.mjs.
# Omit <remote-host> to use `.moon/workspace.yml` as-is.
#
#   ./bench.sh A 5                              # the configured cache
#   ./bench.sh B 5 'grpc://127.0.0.1:9092'      # a local bazel-remote
#   node analyze.mjs .moon-bench
#
# Interleave the arms — run A, then B, then A again — rather than all of one then all of the other,
# or a change in machine load reads as a difference between caches.
set -uo pipefail

ROOT=$(git rev-parse --show-toplevel)
OUT="${OUT:-$ROOT/.moon-bench}"
# Not a bare `moon`: `proto activate` can put an older version ahead of the shims on PATH, and the
# client version is part of what is being measured.
MOON="${MOON:-$HOME/.proto/shims/moon}"

ARM="${1:?usage: bench.sh <arm> <reps> [remote-host] [target]}"
REPS="${2:?missing rep count}"
HOST="${3:-}"
TARGET="${4:-build}"

cd "$ROOT" || exit 1
mkdir -p "$OUT"

echo "== $($MOON --version) | $(git rev-parse --short HEAD) | :$TARGET | ${HOST:-workspace.yml}"

for i in $(seq 1 "$REPS"); do
  # The local cache must be cold or it masks the remote path entirely. The toolchain and pnpm store
  # stay warm deliberately — they are not under test.
  rm -rf .moon/cache/outputs .moon/cache/states .moon/cache/hashes
  if [ -n "$HOST" ]; then
    MOON_REMOTE_HOST="$HOST" "$MOON" run ":$TARGET" > "$OUT/$ARM$i.log" 2>&1
  else
    "$MOON" run ":$TARGET" > "$OUT/$ARM$i.log" 2>&1
  fi
  code=$?
  cp .moon/cache/runReport.json "$OUT/report-$ARM$i.json"
  echo "== $ARM$i exit=$code hits=$(grep -c 'cached from remote' "$OUT/$ARM$i.log")"
done

echo "== node tools/moon-cache/bench/analyze.mjs $OUT"
