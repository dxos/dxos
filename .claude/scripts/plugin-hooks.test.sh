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

# Counted, not `all`-ed: a jq `all` over an empty selection answers true, so an assertion phrased
# that way passes just as happily when the handler it describes has been deleted. Each reporting
# hook is therefore required to exist exactly once, by event, with its exact wiring — the whole
# point of this file is to catch a hook that has silently stopped firing.
session_handlers() {
  jq --arg event "$1" '
    [ .hooks[$event][]?.hooks[]?
      | select(.type == "mcp_tool")
      | select(.server == "plugin:dxos:composer")
      | select(.tool == "invokeOperation")
      | select(.input.key == "org.dxos.operation.tasks.recordSession")
      | select(.input.input.sessionId == "${session_id}")
    ]' "$config"
}

for event in UserPromptSubmit Stop SessionEnd; do
  check "$event reports the session exactly once, with the full wiring" '1' \
    "$(session_handlers "$event" | jq -r 'length')"
done

# Each event reports what only it knows: the prompt carries the worktree, `Stop` carries the turn's
# final message, and `SessionEnd` is the only one that may write a terminal state.
check 'the prompt hook reports the worktree' '"${cwd}"' \
  "$(session_handlers UserPromptSubmit | jq -c '.[0].input.input.worktree')"

check 'the prompt hook sends no state, so it cannot fight a close' 'null' \
  "$(session_handlers UserPromptSubmit | jq -r '.[0].input.input.state // "null"')"

check 'the stop hook carries the final assistant message' '"${last_assistant_message}"' \
  "$(session_handlers Stop | jq -c '.[0].input.input.lastMessage')"

check 'the end hook closes the session' 'finished' \
  "$(session_handlers SessionEnd | jq -r '.[0].input.input.state')"

# `resume` and `clear` fire while the user is still working; closing on them would mark a paused
# session finished.
check 'SessionEnd closes only on the reasons that mean the work is over' 'logout|prompt_input_exit|other' \
  "$(jq -r '.hooks.SessionEnd[0].matcher' "$config")"

# The directive hook is what makes `/dxos:project` work at all, so it is required too.
check 'the project directive hook is still wired' '1' \
  "$(jq -r '[.hooks.UserPromptSubmit[].hooks[] | select(.type == "command") | select(.command | test("track.sh"))] | length' "$config")"

printf '\n%s passed, %s failed\n' "$pass" "$fail"
[ "$fail" -eq 0 ]
