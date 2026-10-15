#!/usr/bin/env bash
# Serves the DEUS Worker (platform/worker) on local workerd with a local bucket and key database,
# then pushes a codebase to it over HTTPS's plain sibling, pulls it into a fresh store, and
# publishes its explorer (D164): the same commands threads run against the deployed Worker.
set -euo pipefail
cd "$(dirname "$0")/.."
work="$(mktemp -d)"
wrangler="$(git rev-parse --show-toplevel)/node_modules/.bin/wrangler"
server=""
stop() { if [ -n "$server" ]; then kill -- "-$server" 2>/dev/null || true; fi; }
trap 'stop; rm -rf "$work"' EXIT
export WRANGLER_SEND_METRICS=false CI=1
# Sessions carry the deployed Worker's key, which `remote add` would store for this local one.
unset DEUS_API_KEY
state="$work/state"
deus() { node bin/deus.mjs "$@"; }

# The key database, migrated, with the key a session holds: push and the site, not compact, so
# every push must name the head it builds on (D167).
(cd platform/worker && "$wrangler" d1 migrations apply deus-auth --local --persist-to "$state" >/dev/null)
key="$(node -e "
  const { mintKey } = await import('./platform/worker/remote.mjs');
  const minted = await mintKey();
  console.log(JSON.stringify(minted));
" --input-type=module)"
id="$(node -pe "JSON.parse(process.argv[1]).id" "$key")"
hash="$(node -pe "JSON.parse(process.argv[1]).secretHash" "$key")"
(cd platform/worker && "$wrangler" d1 execute deus-auth --local --persist-to "$state" --command \
  "insert into api_keys (id, secret_hash, label, scopes, projects, created_at) values ('$id', '$hash', 'test', '[\"push\",\"site\",\"assets\"]', '\"*\"', 0)" >/dev/null)

port="$(node -e "const s = require('net').createServer().listen(0, () => { console.log(s.address().port); s.close(); })")"
(cd platform/worker && exec setsid "$wrangler" dev --port "$port" --ip 127.0.0.1 --persist-to "$state" --var PREFIX:demo >"$work/wrangler.log" 2>&1) &
server=$!
for _ in $(seq 1 90); do
  if curl -s -o /dev/null --max-time 2 "http://127.0.0.1:$port/v1"; then break; fi
  kill -0 "$server" 2>/dev/null || break
  sleep 1
done
curl -sf "http://127.0.0.1:$port/v1" >/dev/null || { echo "workerd did not start"; cat "$work/wrangler.log"; exit 1; }
remote="http://127.0.0.1:$port/v1/demo"

# Without a key, a push is refused and says why.
export DEUS_CODEBASE="$work/a"
deus init >/dev/null
deus add platform/web.deus examples/counter.deus >/dev/null
deus remote add origin "$remote" >/dev/null
if deus push origin >"$work/refused.log" 2>&1; then echo "a push without a key went through"; exit 1; fi
grep -q 'writes need an API key' "$work/refused.log" || { cat "$work/refused.log"; exit 1; }

export DEUS_API_KEY="$(node -pe "JSON.parse(process.argv[1]).key" "$key")"
deus push origin
deus explore --publish origin >/dev/null

# A fresh store, with no key, pulls the same names.
export DEUS_CODEBASE="$work/b"
unset DEUS_API_KEY
deus init >/dev/null
deus remote add origin "$remote" >/dev/null
deus pull origin
deus merge origin.main >/dev/null
diff <(DEUS_CODEBASE="$work/a" deus ls) <(deus ls) || { echo "the pulled store differs"; exit 1; }

# Packs (D180): each bundle has one, and the Worker finds a name and an object with ranged reads.
packs="$(curl -sf "$remote/packs/")"
for bundle in $(curl -sf "$remote/bundles"); do
  grep -qx "$bundle.idx" <<<"$packs" || { echo "bundle $bundle has no pack"; exit 1; }
done
name="$(deus ls | awk '$2 == "term" { print $1 }' | grep -v '^lib\.' | grep '\.' | tail -1)"
found="$(curl -sf "$remote/names/main/$name")" || { echo "the Worker did not find $name"; exit 1; }
object="$(node -pe "JSON.parse(process.argv[1]).hash" "$found")"
stored="$(cat "$work/b/objects/${object:0:2}/$object")"
[[ "$(curl -sf "$remote/objects/$object")" == "$stored" ]] || { echo "the Worker's $name differs from the store's"; exit 1; }
[[ "$(node -pe "JSON.parse(process.argv[1]).text" "$found")" == "$stored" ]] || { echo "the name lookup's text differs"; exit 1; }

# Two sessions working off the same head: the second push is refused until it merges the first.
export DEUS_API_KEY="$(node -pe "JSON.parse(process.argv[1]).key" "$key")"
printf 'namespace Two\ndef two : Int := 2\n' >"$work/two.deus"
printf 'namespace Three\ndef three : Int := 3\n' >"$work/three.deus"
DEUS_CODEBASE="$work/a" deus add "$work/two.deus" >/dev/null
DEUS_CODEBASE="$work/a" deus push origin >/dev/null
deus add "$work/three.deus" >/dev/null
# `--no-merge`: a push otherwise pulls, merges and retries by itself.
if deus push origin --no-merge >"$work/stale.log" 2>&1; then echo "a push that would fork main went through"; exit 1; fi
grep -q 'then push again' "$work/stale.log" || { cat "$work/stale.log"; exit 1; }
deus pull origin >/dev/null
deus merge origin.main >/dev/null
deus push origin >/dev/null
unset DEUS_API_KEY

# The explorer of the project PREFIX is served at the Worker's root, from what the push wrote.
page="$(curl -sf "http://127.0.0.1:$port/")"
[[ "$page" == *"<html"* ]] || { echo "no explorer at /"; exit 1; }
version="$(curl -sf "http://127.0.0.1:$port/v1/demo/files/site/HEAD")"
[[ "$page" == *"<base href=\"/v/$version/\""* ]] || { echo "the page is not pinned to HEAD"; exit 1; }
meta="$(curl -sf "http://127.0.0.1:$port/v/$version/meta.json")"
node -e "JSON.parse(process.argv[1])" "$meta" || { echo "no meta.json"; exit 1; }
echo "remote: push, pull and the explorer work through the Worker on workerd"
