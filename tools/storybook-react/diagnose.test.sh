#!/usr/bin/env bash
#
# Copyright 2026 DXOS.org
#
# Tests for the watcher's discovery, status file, and --status against a throwaway
# HTTP listener. Run: bash tools/storybook-react/diagnose.test.sh

set -uo pipefail

repo=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
script="$repo/tools/storybook-react/diagnose.sh"
sandbox=$(mktemp -d)
export DX_WATCH_DIR="$sandbox/watch"
# Every process this test starts is its own; the watcher below runs only against the sandbox
# DX_WATCH_DIR and the throwaway DX_WATCH_PORTS, never a real dev server.
cleanup() {
  [ -n "${server:-}" ] && kill "$server" 2>/dev/null
  [ -n "${watcher:-}" ] && kill "$watcher" 2>/dev/null
  [ -n "${legacy:-}" ] && kill "$legacy" 2>/dev/null
  [ -f "$DX_WATCH_DIR/watcher.pid" ] && kill "$(cat "$DX_WATCH_DIR/watcher.pid")" 2>/dev/null
  # The 7s interval is section 9's fingerprint — a watcher a real session started never
  # carries it, so nothing here can signal a process this suite did not spawn.
  for own in $(pgrep -f 'diagnose\.sh --watch --interval 7 ' 2>/dev/null); do
    kill "$own" 2>/dev/null
  done
  rm -rf "$sandbox"
  return 0
}
trap cleanup EXIT

pass=0; fail=0
check() {
  local label=$1 expected=$2 actual=$3
  if [ "$expected" = "$actual" ]; then printf 'PASS  %s\n' "$label"; pass=$((pass + 1))
  else printf 'FAIL  %s\n        expected: %s\n        actual:   %s\n' "$label" "$expected" "$actual"; fail=$((fail + 1)); fi
}
row() { awk -F'\t' -v port="$1" '$1 == port' "$DX_WATCH_DIR/status"; }
col() { row "$1" | cut -f"$2"; }

# A free port: bind 0 through python and read back what it chose.
port=$(python3 -c 'import socket; s=socket.socket(); s.bind(("127.0.0.1",0)); print(s.getsockname()[1]); s.close()')
mkdir -p "$sandbox/www" && printf '{}' > "$sandbox/www/index.json"
# `lsof` reports the real path, which `mktemp` on macOS hides behind a /var symlink.
www=$(cd "$sandbox/www" && pwd -P)
(cd "$sandbox/www" && exec python3 -m http.server "$port" --bind 127.0.0.1 > /dev/null 2>&1) &
server=$!
until curl -sf -m 1 -o /dev/null "http://127.0.0.1:$port/"; do sleep 0.2; done
export DX_WATCH_PORTS="$port 1"

echo '=== 1. --status with no watcher says unwatched'
check '1a unwatched' '1' "$(bash "$script" --status | grep -c '^unwatched')"
check '1b exit 0' '0' "$(bash "$script" --status > /dev/null; echo $?)"

echo '=== 2. one cycle discovers the listener and the unbound port'
bash "$script" --once --timeout 2 > /dev/null 2>&1
check '2a status file written' 'yes' "$([ -f "$DX_WATCH_DIR/status" ] && echo yes || echo no)"
check '2b listener answered' 'answered' "$(col "$port" 5)"
check '2c pid recorded' "$server" "$(col "$port" 2)"
check '2d kind is vite (not storybook)' 'vite' "$(col "$port" 3)"
check '2e worktree is the cwd' "$www" "$(col "$port" 4)"
check '2f port 1 unbound' 'unbound' "$(col 1 5)"

echo '=== 3. the singleton owns the pidfile'
bash "$script" --watch --interval 60 --timeout 2 > "$sandbox/watch.log" 2>&1 &
watcher=$!
until [ -s "$DX_WATCH_DIR/watcher.pid" ]; do sleep 0.2; done
out=$(bash "$script" --status)
check '3a header' '1' "$(printf '%s' "$out" | grep -c '^port')"
check '3b row for the listener' '1' "$(printf '%s' "$out" | grep -c "^$port	")"
second=$(bash "$script" --watch --interval 60 --timeout 2 2>&1)
check '3c a second --watch refuses' '1' "$(printf '%s' "$second" | grep -c 'already running')"
check '3d the pidfile still names the singleton' "$watcher" "$(cat "$DX_WATCH_DIR/watcher.pid")"
kill "$watcher" 2>/dev/null; wait "$watcher" 2>/dev/null; watcher=''
printf '%s' "$$" > "$DX_WATCH_DIR/watcher.pid"
check '3e an unrelated live pid is unwatched' '1' "$(bash "$script" --status | grep -c '^unwatched')"
printf '99999999' > "$DX_WATCH_DIR/watcher.pid"
check '3f dead pid is unwatched' '1' "$(bash "$script" --status | grep -c '^unwatched')"

echo '=== 4. a vanished server is gone for one cycle, then unbound'
kill "$server"; wait "$server" 2>/dev/null; server=''
bash "$script" --once --timeout 2 > /dev/null 2>&1
check '4a gone' 'gone' "$(col "$port" 5)"
bash "$script" --once --timeout 2 > /dev/null 2>&1
check '4b unbound' 'unbound' "$(col "$port" 5)"

echo '=== 5. known_ports merges launch.json with the defaults'
unset DX_WATCH_PORTS
ports=$(bash "$script" --ports)
check '5a includes 9009' '1' "$(printf '%s\n' "$ports" | grep -cx 9009)"
check '5b includes 5199' '1' "$(printf '%s\n' "$ports" | grep -cx 5199)"
check '5c includes a launch.json port' '1' "$(printf '%s\n' "$ports" | grep -cx 5180)"
check '5d de-duplicated' "$(printf '%s\n' "$ports" | sort -u | wc -l | tr -d ' ')" "$(printf '%s\n' "$ports" | wc -l | tr -d ' ')"

echo '=== 6. etime is converted to seconds in every ps format'
check '6a mm:ss' '312' "$(bash "$script" --etime-seconds 05:12)"
check '6b hh:mm:ss' '3723' "$(bash "$script" --etime-seconds 1:02:03)"
check '6c dd-hh:mm:ss' '183845' "$(bash "$script" --etime-seconds 2-03:04:05)"

echo '=== 7. a legacy per-port watcher is named by --status and reaped'
# A fake this test owns, on a port nothing uses: --reap-legacy is given that port so the run
# can never signal a real watcher belonging to another session.
exec -a "diagnose.sh --watch --port 9999" sleep 300 &
legacy=$!
until ps -o command= -p "$legacy" 2>/dev/null | grep -q -- '--watch --port 9999'; do sleep 0.2; done
check '7a --status names --restart' '1' "$(bash "$script" --status | grep -c -- '--restart')"
reap_out=$(bash "$script" --reap-legacy 9999)
check '7a2 reap names the reaped pid' '1' "$(printf '%s\n' "$reap_out" | grep -c "reaped legacy watcher pid $legacy")"
# A signalled child stays a pid until it is reaped, so "gone" means absent or a zombie.
gone() {
  case "$(ps -o state= -p "$1" 2>/dev/null | tr -d ' ')" in
    '' | Z*) printf 'gone' ;;
    *) printf 'alive' ;;
  esac
}
for _attempt in 1 2 3 4 5 6 7 8 9 10; do
  [ "$(gone "$legacy")" = gone ] && break
  sleep 0.2
done
check '7b the fake was reaped' 'gone' "$(gone "$legacy")"
# Only reap a fake that actually died; waiting on a survivor would hang the suite for its
# full sleep. A survivor stays in $legacy so the EXIT trap still kills it.
if [ "$(gone "$legacy")" = gone ]; then
  wait "$legacy" 2>/dev/null
  legacy=''
fi

echo '=== 8. status fields are flattened to one printable line'
check '8a a newline becomes one line' '1' "$(bash "$script" --sanitize "$(printf 'a\nIGNORE')" | wc -l | tr -d ' ')"
check '8b the newline renders as ?' 'a?IGNORE' "$(bash "$script" --sanitize "$(printf 'a\nIGNORE')")"
check '8c a tab renders as ?' '/tmp/a?b' "$(bash "$script" --sanitize "$(printf '/tmp/a\tb')")"
check '8d an ordinary path is untouched' '/tmp/a b' "$(bash "$script" --sanitize '/tmp/a b')"

echo '=== 9. --ensure holds the lock until the watcher owns the pidfile'
# Port 1 has no listener and the reap is narrowed to it, so this cannot capture, signal, or
# poll anything outside the sandbox — the machine's real watcher is untouched. The 7s interval
# is a fingerprint no real watcher carries, so the assertions below count only this suite's.
export DX_WATCH_PORTS=1
export DX_REAP_MATCH=1
fingerprint='diagnose\.sh --watch --interval 7 '
own_watchers() { pgrep -f "$fingerprint" 2>/dev/null; }
reap_own() {
  local own attempt=0
  for own in $(own_watchers); do kill "$own" 2>/dev/null; done
  # Bounded: a suite that waits forever on a survivor reports nothing at all.
  while [ -n "$(own_watchers)" ] && [ "$attempt" -lt 25 ]; do
    sleep 0.2
    attempt=$((attempt + 1))
  done
  rm -f "$DX_WATCH_DIR/watcher.pid"
}
reap_own
bash "$script" --ensure --interval 7 --timeout 2 > /dev/null 2>&1
# The whole point of the wait: returning before the child claims the pidfile is what lets the
# next caller see no watcher and spawn a second one.
check '9a the pidfile is owned the moment --ensure returns' '0' "$(bash "$script" --status | grep -c '^unwatched')"
check '9b the pidfile names the spawned watcher' '1' "$(own_watchers | grep -cx "$(cat "$DX_WATCH_DIR/watcher.pid" 2>/dev/null)")"
reap_own

bash "$script" --ensure --interval 7 --timeout 2 > /dev/null 2>&1 &
ensure_a=$!
bash "$script" --ensure --interval 7 --timeout 2 > /dev/null 2>&1 &
ensure_b=$!
wait "$ensure_a" "$ensure_b"
check '9c two concurrent calls start exactly one watcher' '1' "$(own_watchers | wc -l | tr -d ' ')"
reap_own

printf '\n%s passed, %s failed\n' "$pass" "$fail"
[ "$fail" -eq 0 ]
