#!/usr/bin/env bash
# Compare two remote caches on one runner, in one job.
#
#   ci-bench.sh [reps] [target]
#
# `bench.sh` switches caches with MOON_REMOTE_HOST, which carries neither an auth token nor a TLS
# block — so it cannot reach a cache that needs either. This one rewrites the `remote` block in
# `.moon/workspace.yml` per arm instead, which is the only way to put Depot's bearer token and the
# self-hosted mTLS certificates in the same run.
#
# The cost of that is a re-hash: the config is a task input, so each arm has its own hashes and
# needs its own seeding run. That is why every arm builds cold once before any rep is recorded.
# Arms are interleaved after seeding (A,B,A,B) so a change in runner load reads as variance within
# an arm rather than as a difference between caches.
#
# Reports land in $OUT/report-<arm><n>.json for analyze.mjs. `.moon/workspace.yml` is restored on
# exit.
set -uo pipefail

ROOT=$(git rev-parse --show-toplevel)
OUT="${OUT:-$ROOT/.moon-bench}"
REPS="${1:-${REPS:-3}}"
TARGET="${2:-${TARGET:-build}}"
ARMS="${ARMS:-selfhosted depot}"
MOON="${MOON:-moon}"
CONFIG="$ROOT/.moon/workspace.yml"

cd "$ROOT" || exit 1
mkdir -p "$OUT"
trap 'git checkout -- "$CONFIG" 2>/dev/null || true' EXIT

# The `remote` block each arm runs with. Kept here rather than in a fixture file so the rest of
# `workspace.yml` is always whatever the commit under test says.
remote_block() {
  case "$1" in
    selfhosted)
      cat <<'YAML'
remote:
  host: 'grpcs://cache.dxos.network:9092'
  mtls:
    caCert: '.moon/certs/ca.pem'
    clientCert: '.moon/certs/client.pem'
    clientKey: '.moon/certs/client.key'
    domain: 'cache.dxos.network'
YAML
      ;;
    depot)
      # As committed before PR #12494. `token` names the environment variable, not the secret.
      cat <<'YAML'
remote:
  host: 'grpcs://cache.depot.dev'
  auth:
    token: 'DEPOT_TOKEN'
    headers:
      'X-Depot-Org': 't8fblrl00n'
YAML
      ;;
    *)
      echo "unknown arm: $1" >&2
      return 1
      ;;
  esac
}

# Replace the top-level `remote:` block, leaving every other key alone. A top-level key is a line
# starting in column zero, which is what ends the block.
write_config() {
  local arm=$1 replacement
  replacement=$(remote_block "$arm") || return 1
  git checkout -- "$CONFIG" || return 1
  awk -v replacement="$replacement" '
    /^remote:/ { print replacement; print ""; skip = 1; next }
    skip && /^[^[:space:]#]/ { skip = 0 }
    !skip { print }
  ' "$CONFIG" > "$CONFIG.arm" && mv "$CONFIG.arm" "$CONFIG"
  grep -q "^remote:" "$CONFIG" || { echo "== $arm: remote block did not survive the rewrite" >&2; return 1; }
}

# One run with a cold local cache. The toolchain and pnpm store stay warm deliberately — they are
# not under test. The report is removed as well as the caches: without that, a failed run would
# leave the previous one's report to be copied as if it were this one's.
run_once() {
  local label=$1 log="$OUT/$1.log" code hits
  rm -rf .moon/cache/outputs .moon/cache/states .moon/cache/hashes .moon/cache/runReport.json
  "$MOON" run ":$TARGET" > "$log" 2>&1
  code=$?
  hits=$(grep -c 'cached from remote' "$log")
  echo "== $label exit=$code remote_hits=$hits"
  if [ "$code" -ne 0 ]; then
    echo "== $label FAILED — tail of $log:"
    tail -40 "$log"
    return "$code"
  fi
  [ -f .moon/cache/runReport.json ] || { echo "== $label produced no run report"; return 1; }
  # A green run proves nothing: an absent, rejected or unroutable cache all produce a passing build
  # with no caching at all. Non-zero hits is the only evidence the arm measured a cache.
  if [ "$label" != "${label#seed-}" ] || [ "$hits" -gt 0 ]; then
    return 0
  fi
  echo "== $label had zero remote hits — the arm measured a rebuild, not a cache."
  return 1
}

record() {
  local label=$1
  run_once "$label" || return 1
  cp .moon/cache/runReport.json "$OUT/report-$label.json"
}

# TCP connect time to each cache, so per-task hydration can be read against the round trip it is
# made of. `time_connect` is the TCP handshake and is reported even when the TLS layer then fails.
echo "== RTT"
for host_port in cache.dxos.network:9093 cache.depot.dev:443; do
  samples=$(for _ in 1 2 3; do
    curl -s -o /dev/null --max-time 10 -w '%{time_connect} ' "https://$host_port" 2>/dev/null || true
  done)
  echo "   $host_port  ${samples:-unreachable}"
done

echo "== $($MOON --version | tail -1) | $(git rev-parse --short HEAD) | :$TARGET | $REPS reps | arms: $ARMS"

# Seed. Each arm's hashes are new, so this is a cold build per arm and is not a measurement.
for arm in $ARMS; do
  write_config "$arm" || exit 1
  echo "== seeding $arm (cold build, uploads; not a measurement)"
  run_once "seed-$arm" || exit 1
done

for rep in $(seq 1 "$REPS"); do
  for arm in $ARMS; do
    write_config "$arm" || exit 1
    record "$arm$rep" || exit 1
  done
done

echo
node "$ROOT/tools/moon-cache/bench/analyze.mjs" "$OUT"
