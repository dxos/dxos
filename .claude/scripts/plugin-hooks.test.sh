#!/usr/bin/env bash
#
# Copyright 2026 DXOS.org
#
# Shape check for the `dxos` plugin's hook configuration. Run it by hand:
#
#   bash .claude/scripts/plugin-hooks.test.sh
#
# It exists because a handler at the wrong depth is still valid JSON and the harness simply
# ignores it — the hook then never fires, silently, which is exactly how the session-reporting
# hook shipped broken once. Every event entry must carry its handlers in a `hooks` array.

set -uo pipefail

repo=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
config="$repo/tools/claude/plugins/dxos/hooks/hooks.json"

pass=0
fail=0

check() {
  local label=$1 expected=$2 actual=$3
  if [ "$expected" = "$actual" ]; then
    printf 'PASS  %s\n' "$label"
    pass=$((pass + 1))
  else
    printf 'FAIL  %s\n        expected: %s\n        actual:   %s\n' "$label" "$expected" "$actual"
    fail=$((fail + 1))
  fi
}

check 'the config is valid JSON with a hooks object' 'object' "$(jq -r '.hooks | type' "$config")"

check 'every event entry carries a hooks array' 'true' \
  "$(jq -r '[.hooks[][] | (.hooks | type) == "array"] | all' "$config")"

check 'every handler names a type' 'true' \
  "$(jq -r '[.hooks[][].hooks[] | has("type")] | all' "$config")"

check 'every mcp_tool handler names a server and a tool' 'true' \
  "$(jq -r '[.hooks[][].hooks[] | select(.type == "mcp_tool") | has("server") and has("tool")] | all' "$config")"

# The session verb is addressed by key through the dispatcher, so a typo in either is a hook that
# resolves to nothing at runtime.
check 'session hooks invoke the record verb through the dispatcher' 'true' \
  "$(jq -r '[.hooks[][].hooks[] | select(.type == "mcp_tool")
              | .tool == "invokeOperation" and .input.key == "org.dxos.operation.tasks.recordSession"] | all' "$config")"

check 'the session id is substituted into every session hook' 'true' \
  "$(jq -r '[.hooks[][].hooks[] | select(.type == "mcp_tool") | .input.input.sessionId == "${session_id}"] | all' "$config")"

# `resume` and `clear` fire while the user is still working; closing on them would mark a paused
# session finished.
check 'SessionEnd closes only on the reasons that mean the work is over' 'logout|prompt_input_exit|other' \
  "$(jq -r '.hooks.SessionEnd[0].matcher' "$config")"

printf '\n%s passed, %s failed\n' "$pass" "$fail"
[ "$fail" -eq 0 ]
