#!/usr/bin/env bash
#
# Copyright 2026 DXOS.org
#
# Tests for the composer-ui reminder hook, fed the JSON a `PostToolUse` event
# carries. Run it by hand:
#
#   bash .claude/scripts/ui-skill.test.sh
#
# Markers go to a throwaway directory so a run never suppresses the reminder for
# the session running it.

set -uo pipefail

repo=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
hook="$repo/.claude/hooks/ui-skill.sh"
markers=$(mktemp -d)
trap 'rm -rf "$markers"' EXIT

export CLAUDE_PROJECT_DIR="$repo"
export DXOS_UI_SKILL_MARKERS="$markers"

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

run() { jq -nc --arg p "$1" --arg s "$2" '{session_id: $s, tool_name: "Edit", tool_input: {file_path: $p}}' | bash "$hook"; }
fires() { [ -n "$1" ] && printf 'fires' || printf 'silent'; }
context() { printf '%s' "$1" | jq -r '.hookSpecificOutput.additionalContext'; }
has() { context "$1" | grep -q "$2" && printf 'yes' || printf 'no'; }

out=$(run "$repo/packages/ui/react-ui-canvas/src/components/Properties/Properties.tsx" s1)
check 'first UI edit fires' fires "$(fires "$out")"
check 'event name is PostToolUse' PostToolUse "$(printf '%s' "$out" | jq -r '.hookSpecificOutput.hookEventName')"
check 'injects the non-negotiables heading' yes "$(has "$out" '^## Non-negotiables')"
check 'injects the ScrollArea item' yes "$(has "$out" 'ScrollArea.Viewport')"
check 'stops before the imports line' no "$(has "$out" '^Imports are')"

check 'second UI edit in the same session is silent' silent \
  "$(fires "$(run "$repo/packages/plugins/plugin-deck/src/Foo.tsx" s1)")"
check 'a new session fires again' fires "$(fires "$(run "$repo/packages/plugins/plugin-deck/src/Foo.tsx" s2)")"
check 'relative paths match' fires "$(fires "$(run 'packages/stories/stories-inbox/src/Bar.tsx' s3)")"

check 'non-tsx file is silent' silent "$(fires "$(run "$repo/packages/ui/react-ui/src/foo.ts" s4)")"
check 'tsx outside UI packages is silent' silent "$(fires "$(run "$repo/packages/core/echo/src/Foo.tsx" s5)")"
check 'a non-UI edit leaves no marker' absent "$([ -e "$markers/s5" ] && echo present || echo absent)"

printf '\n%d passed, %d failed\n' "$pass" "$fail"
[ "$fail" -eq 0 ]
