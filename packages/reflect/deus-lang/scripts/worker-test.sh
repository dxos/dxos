#!/usr/bin/env bash
# Builds examples/counter.deus as a Cloudflare Worker and serves it on local workerd
# (`wrangler dev`): each Durable Object keeps its own count across requests (P7, D45).
set -euo pipefail
cd "$(dirname "$0")/.."
work="$(mktemp -d)"
wrangler="$(git rev-parse --show-toplevel)/node_modules/.bin/wrangler"
port="${PORT:-$(node -e "const s = require('net').createServer().listen(0, () => { console.log(s.address().port); s.close(); })")}"
# The server runs in its own process group: wrangler starts workerd as a child.
trap 'kill -- "-${server:-0}" 2>/dev/null || true; rm -rf "$work"' EXIT
export DEUS_CODEBASE="$work/codebase"
node bin/deus.mjs init >/dev/null
node bin/deus.mjs add deus/builtins.deus deus/prelude.deus platform/cloudflare.deus examples/counter.deus >/dev/null
node bin/deus.mjs test Counter
node bin/deus.mjs build Counter.serve -o "$work/worker" --worker
(cd "$work/worker" && WRANGLER_SEND_METRICS=false CI=1 exec setsid "$wrangler" dev --port "$port" --ip 127.0.0.1 >"$work/wrangler.log" 2>&1) &
server=$!
ready=""
for _ in $(seq 1 90); do
  if curl -s -o /dev/null --max-time 2 "http://127.0.0.1:$port/?actor=probe"; then ready=1; break; fi
  sleep 1
done
[ -n "$ready" ] || { echo "workerd did not start"; cat "$work/wrangler.log"; exit 1; }
expect() {
  local got
  got="$(curl -s --max-time 10 "http://127.0.0.1:$port/?actor=$1")"
  [ "$got" = "$2" ] || { echo "actor $1: expected '$2', got '$got'"; cat "$work/wrangler.log"; exit 1; }
}
expect a "count 1"
expect a "count 2"
expect b "count 1"
expect a "count 3"
echo "worker: Durable Objects keep separate counts on workerd"
