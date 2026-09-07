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
trap 'rm -rf "$sandbox"; [ -n "${server:-}" ] && kill "$server" 2>/dev/null' EXIT

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

echo '=== 3. --status prints the table when a watcher pid is alive'
printf '%s' "$$" > "$DX_WATCH_DIR/watcher.pid"
out=$(bash "$script" --status)
check '3a header' '1' "$(printf '%s' "$out" | grep -c '^port')"
check '3b row for the listener' '1' "$(printf '%s' "$out" | grep -c "^$port	")"
printf '99999999' > "$DX_WATCH_DIR/watcher.pid"
check '3c dead pid is unwatched' '1' "$(bash "$script" --status | grep -c '^unwatched')"

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

printf '\n%s passed, %s failed\n' "$pass" "$fail"
[ "$fail" -eq 0 ]
