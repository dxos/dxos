#!/usr/bin/env bash
# Builds the Durable Object examples as Cloudflare Workers and serves them on local workerd
# (`wrangler dev`) (P7, D45): each object keeps its own state, objects call each other by name,
# and an alarm set by one request arrives later as an `ALARM` request.
set -euo pipefail
cd "$(dirname "$0")/.."
work="$(mktemp -d)"
wrangler="$(git rev-parse --show-toplevel)/node_modules/.bin/wrangler"
# Each server runs in its own process group: wrangler starts workerd as a child.
server=""
stop() { if [ -n "$server" ]; then kill -- "-$server" 2>/dev/null || true; fi; }
trap 'stop; rm -rf "$work"' EXIT
export DEUS_CODEBASE="$work/codebase"
node bin/deus.mjs init >/dev/null
node bin/deus.mjs add deus/builtins.deus deus/prelude.deus platform/web.deus examples/counter.deus examples/tally.deus examples/notes.deus >/dev/null
node bin/deus.mjs test Counter
node bin/deus.mjs test Tally
node bin/deus.mjs test Notes

# Builds `$1` as a Worker and serves it on a free port, replacing the previous server.
serve() {
  stop
  port="$(node -e "const s = require('net').createServer().listen(0, () => { console.log(s.address().port); s.close(); })")"
  node bin/deus.mjs build "$1" -o "$work/$1" --worker
  (cd "$work/$1" && WRANGLER_SEND_METRICS=false CI=1 exec setsid "$wrangler" dev --port "$port" --ip 127.0.0.1 >"$work/wrangler.log" 2>&1) &
  server=$!
  for _ in $(seq 1 90); do
    if curl -s -o /dev/null --max-time 2 "http://127.0.0.1:$port/?actor=probe"; then return; fi
    sleep 1
  done
  echo "workerd did not start"
  cat "$work/wrangler.log"
  exit 1
}

# expect <path?actor=…> <response> [method]
expect() {
  local got
  got="$(curl -s --max-time 10 -X "${3:-GET}" "http://127.0.0.1:$port$1")"
  [ "$got" = "$2" ] || { echo "$1: expected '$2', got '$got'"; cat "$work/wrangler.log"; exit 1; }
}

serve Counter.serve
expect "/?actor=a" "count 1"
expect "/?actor=a" "count 2"
expect "/?actor=b" "count 1"
expect "/?actor=a" "count 3"
echo "worker: Durable Objects keep separate counts on workerd"

serve Tally.serve
expect "/add?actor=a" "count 1, total 1" POST
expect "/add?actor=b" "count 1, total 2" POST
expect "/add?actor=a" "count 2, total 3" POST
expect "/remind?actor=c" "reminder set" POST
expect "/reminded?actor=c" "no"
for _ in $(seq 1 20); do
  [ "$(curl -s --max-time 5 "http://127.0.0.1:$port/reminded?actor=c")" = "yes" ] && break
  sleep 0.5
done
expect "/reminded?actor=c" "yes"
echo "worker: objects call each other by name, and alarms fire, on workerd"

# The notes service, unchanged from the native server (D57): headers and per-object storage.
serve Notes.serve
expect "/notes/greet?actor=me" "stored greet" PUT
expect "/notes/greet?actor=me" "stored greet" POST
expect "/notes?actor=me" "greet"
[ "$(curl -s -o /dev/null -w '%{content_type}' "http://127.0.0.1:$port/?actor=me")" = "text/html; charset=utf-8" ] || { echo "notes index is not HTML"; exit 1; }
echo "worker: the notes service runs unchanged on workerd"
