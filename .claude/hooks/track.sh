#!/usr/bin/env bash
#
# Copyright 2026 DXOS.org
#
# UserPromptSubmit hook for the task-tracking sentinel.
#
# When a message contains `$track <text>` (anywhere) or a line beginning
# `track: <text>`, inject a directive telling the agent to record <text> as a
# follow-up in the active TASKS.md (see the task-tracking skill), rather than
# spawning a background task chip. Stateless: emits one directive per matching
# message and nothing otherwise.

set -euo pipefail

input=$(cat)
prompt=$(printf '%s' "$input" | jq -r '.prompt // empty' 2>/dev/null || printf '')

# Sentinel: `$track ...` (whitespace required after, so `$tracking`/`$tracked`
# don't match) anywhere, or a line starting with `track: ...`.
task=$(printf '%s\n' "$prompt" \
  | grep -ioE '(\$track[[:space:]]+|^[[:space:]]*track:)[[:space:]]*.*' \
  | head -1 \
  | sed -E 's/^[[:space:]]*(\$track|track:)[[:space:]]*//I' || true)

if [ -n "${task:-}" ]; then
  printf 'TASK-TRACKING DIRECTIVE: the user used the track sentinel. Record this follow-up in the TASKS.md of the current unit of work (package or directory) per the task-tracking skill — do NOT use a background task chip. Item: "%s". Confirm in one short line.\n' "$task"
fi
