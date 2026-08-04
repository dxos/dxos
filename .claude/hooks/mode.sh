#!/usr/bin/env bash
#
# Copyright 2026 DXOS.org
#
# UserPromptSubmit hook for the response-verbosity mode.
#
# 1. Toggle: `/mode terse` | `/mode normal` (or the legacy `$mode <MODE>`
#    sentinel) sets the mode. This event carries the RAW typed text and runs
#    before the model does, so the write is deterministic — the command's own
#    expansion could only ask the agent to comply, and would land too late to
#    gate the turn it appears in.
# 2. Enforce: inject the response rules into the prompt context on every turn;
#    only the length clause varies with the mode.

set -euo pipefail

root="${CLAUDE_PROJECT_DIR:-$(pwd)}"
script="$root/.claude/scripts/mode.sh"

input=$(cat)
prompt=$(printf '%s' "$input" | jq -r '.prompt // empty' 2>/dev/null || printf '')

# `/mode <MODE>` (leading, as a slash command must be) or the legacy `$mode
# <MODE>` sentinel anywhere in the message. UserPromptSubmit sees the RAW typed
# text, so the command is caught here and the state write stays deterministic —
# no UserPromptExpansion hook, and no dependence on the agent complying.
#
# The verb is mandatory in both forms: a bare `$terse` matched prose that merely
# mentioned the modes and flipped them.
modes='terse|concise|normal|natural|default|off'
sentinel=$(printf '%s\n' "$prompt" | grep -ioE "^[[:space:]]*/mode[[:space:]]+($modes)" | head -1 || true)
if [ -z "$sentinel" ]; then
  sentinel=$(printf '%s\n' "$prompt" | grep -ioE "\\\$mode[[:space:]]+($modes)" | head -1 || true)
fi

if [ -n "$sentinel" ]; then
  value=$(printf '%s' "$sentinel" | grep -ioE '(terse|concise|normal|natural|default|off)' \
    | tail -1 | tr '[:upper:]' '[:lower:]')
  if bash "$script" set "$value" >/dev/null 2>&1; then
    printf 'Mode already set via `%s` — do not run the script yourself. Acknowledge the new mode in one short line; only treat the rest of the message as a task if it clearly contains one.\n' "$sentinel"
  else
    printf 'WARNING: failed to persist mode via `%s`; the mode may be stale. Tell the user.\n' "$sentinel"
  fi
fi

exec bash "$script" context
