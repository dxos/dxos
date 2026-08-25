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

# `.moon/workspace.yml` names the client certificate by a repo-relative path, which only exists on
# a CI runner. On a dev machine the certificate lives in ~/.config and is found through absolute
# MOON_REMOTE_MTLS_*, exported by a profile line that a non-interactive shell never sources. Absent
# them moon logs "Failed to connect to storage backend, disabling it" and every rep silently
# measures the local cache — a green run reporting hits=0.
[ -f "$HOME/.config/dxos/moon-cache/env.sh" ] && . "$HOME/.config/dxos/moon-cache/env.sh"

# Give this checkout its own blob store so the per-rep wipe below can empty it. Under
# `unstable_sharedWorktreeCache` the store lives in the *base* checkout, where a wipe would take
# every other worktree's outputs with it.
export MOON_CACHE_SHARED_WORKTREE_CACHE=false
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
  # The report is removed as well as the caches: without this, a failed rep would leave the
  # previous rep's report in place and get copied as if it were this one's.
  # `blobs` and `manifests` are where `casOutputsCache` puts task outputs; `outputs` is the
  # pre-CAS location and is empty under the current config. Miss them and the local store answers
  # every task and the remote is never asked.
  rm -rf .moon/cache/outputs .moon/cache/blobs .moon/cache/manifests \
         .moon/cache/states .moon/cache/hashes .moon/cache/runReport.json
  if [ -n "$HOST" ]; then
    MOON_REMOTE_HOST="$HOST" "$MOON" run ":$TARGET" > "$OUT/$ARM$i.log" 2>&1
  else
    "$MOON" run ":$TARGET" > "$OUT/$ARM$i.log" 2>&1
  fi
  code=$?
  if [ "$code" -ne 0 ]; then
    echo "== $ARM$i FAILED exit=$code — see $OUT/$ARM$i.log"
    exit "$code"
  fi
  if [ ! -f .moon/cache/runReport.json ]; then
    echo "== $ARM$i produced no run report"
    exit 1
  fi
  cp .moon/cache/runReport.json "$OUT/report-$ARM$i.json"
  hits=$(grep -c 'cached from remote' "$OUT/$ARM$i.log")
  echo "== $ARM$i exit=$code hits=$hits"
  if [ "$hits" -eq 0 ]; then
    echo "== $ARM$i hydrated nothing — the remote was not consulted, this rep measures nothing."
    grep -m1 'disabling it' "$OUT/$ARM$i.log" || true
  fi
done

echo "== node tools/moon-cache/bench/analyze.mjs $OUT"
