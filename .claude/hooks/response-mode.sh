#!/usr/bin/env bash
#
# Copyright 2026 DXOS.org
#
# UserPromptSubmit hook for the response-verbosity mode.
#
# 1. Toggle: if the message contains a sentinel like `$concise`, `$natural`, or
#    `$mode concise`, set the mode accordingly (Desktop clients do not expose
#    custom slash commands, so a sentinel in a normal message is the toggle).
# 2. Enforce: while concise mode is active, inject the terseness directive into
#    the prompt context. No-op (prints nothing) in natural mode.

set -euo pipefail

root="${CLAUDE_PROJECT_DIR:-$(pwd)}"
script="$root/.claude/scripts/response-mode.sh"

input=$(cat)
prompt=$(printf '%s' "$input" | jq -r '.prompt // empty' 2>/dev/null || printf '')

# Sentinel: `$`, optional `mode`, then a mode word (case-insensitive).
sentinel=$(printf '%s\n' "$prompt" \
  | grep -ioE '\$[[:space:]]*(mode[[:space:]]+)?(concise|natural|default|off)' \
  | head -1 || true)

if [ -n "$sentinel" ]; then
  value=$(printf '%s' "$sentinel" | grep -ioE '(concise|natural|default|off)' \
    | tail -1 | tr '[:upper:]' '[:lower:]')
  bash "$script" set "$value" >/dev/null 2>&1 || true
  printf 'Response mode set via `%s` sentinel. Acknowledge the new mode in one short line; only treat the rest of the message as a task if it clearly contains one.\n' "$sentinel"
fi

exec bash "$script" context
