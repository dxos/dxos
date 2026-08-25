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
# An `&&` list that fails does not abort a script running without errexit, so source explicitly:
# a half-read env file would otherwise leave the run credential-less and looking deliberate.
if [ -f "$HOME/.config/dxos/moon-cache/env.sh" ]; then
  if ! . "$HOME/.config/dxos/moon-cache/env.sh"; then
    echo "== could not source $HOME/.config/dxos/moon-cache/env.sh — fix it or move it aside." >&2
    exit 1
  fi
fi

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
  # Counted from the run report rather than by grepping the console: MOON_LOG and MOON_QUIET are
  # inherited from whatever shell runs this, and either can suppress the "cached from remote" line
  # while the hydration still happens. The report is the same source `analyze.mjs` reads, and the
  # same query the README gives for checking a cache by hand.
  # `if ! hits=$(...)` rather than a bare assignment: without errexit a failed command
  # substitution leaves `hits` empty, and `[ "" -eq 0 ]` errors and is skipped, so an unreadable
  # report would sail past the zero-hit gate below.
  if ! hits=$(node -e 'const r=require(process.argv[1]);console.log(r.actions.flatMap(a=>a.operations??[]).filter(o=>o.meta?.type==="output-hydration"&&o.status==="cached-from-remote").length)' "$OUT/report-$ARM$i.json"); then
    echo "== $ARM$i could not read $OUT/report-$ARM$i.json — no hit count, so no measurement."
    exit 1
  fi
  case "$hits" in
    ''|*[!0-9]*)
      echo "== $ARM$i hit count is not a number: '$hits'"
      exit 1
      ;;
  esac
  echo "== $ARM$i exit=$code hits=$hits"
  if [ "$hits" -eq 0 ]; then
    # Zero does not separate "the remote was never asked" from "the remote had nothing", and
    # neither is a measurement — the rep timed a cold build. Populating an empty server is the
    # documented way to start an arm, so rep 1 is exempt when more reps follow; a single-rep run
    # has nothing to follow it and fails, rather than reporting a local-only build as a success.
    echo "== $ARM$i observed no remote hits."
    grep -m1 'disabling it' "$OUT/$ARM$i.log" || true
    if [ "$i" -gt 1 ] || [ "$REPS" -eq 1 ]; then
      echo "== $ARM$i measures nothing — see $OUT/$ARM$i.log. Not continuing."
      exit 1
    fi
    echo "== treating rep 1 as a populate pass; rep 2 must hydrate or this arm aborts."
  fi
done

echo "== node tools/moon-cache/bench/analyze.mjs $OUT"
