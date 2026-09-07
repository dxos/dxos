#!/usr/bin/env bash
#
# Copyright 2026 DXOS.org
#
# UserPromptSubmit hook for the response-verbosity mode.
#
# 1. Toggle: `/mode terse` | `/mode normal` sets the mode. This event carries the
#    RAW typed text and runs before the model does, so the write is
#    deterministic — the command's own expansion could only ask the agent to
#    comply, and would land too late to gate the turn it appears in.
# 1b. Focus: `/mode focus [task]` sets TERSE and pins a single task. With no task
#    on the line the pin is the previous user instruction, read from the
#    transcript this event hands us — deriving it here keeps the pin a
#    mechanism, where asking the agent to remember it would only be persuasion.
# 2. Enforce: inject the response rules into the prompt context on every turn;
#    only the length clause varies with the mode.

set -euo pipefail

root="${CLAUDE_PROJECT_DIR:-$(pwd)}"
script="$root/.claude/scripts/mode.sh"

input=$(cat)
prompt=$(printf '%s' "$input" | jq -r '.prompt // empty' 2>/dev/null || printf '')

# `/mode <MODE>`, leading, as a slash command must be. UserPromptSubmit sees the
# RAW typed text, so the command is caught here and the state write stays
# deterministic — no UserPromptExpansion hook, and no dependence on the agent
# complying. Anchoring to the start is what keeps a mid-sentence mention of the
# command, or a path like `src/mode normal.ts`, from flipping the mode.
modes='terse|concise|normal|natural|default|off|focus'
first_line=$(printf '%s' "$prompt" | head -1)
# The trailing boundary is required: without it `/mode tersex` prefix-matches
# `terse`. Trailing task text is still allowed, but only after whitespace.
sentinel=$(printf '%s\n' "$first_line" | grep -ioE "^[[:space:]]*/mode[[:space:]]+($modes)([[:space:]]|$)" | head -1 | sed -E 's/[[:space:]]+$//' || true)

# The last user message in the transcript that is not this turn's prompt, not a
# slash command, and not a tool result — i.e. the instruction `/mode focus` on
# its own means to pin. Empty when there is nothing sensible to pin.
previous_instruction() {
  local file=$1 current=$2
  [ -f "$file" ] || return 0
  jq -rs --arg current "$current" '
    [ .[]
      | select(.type == "user" and (.isMeta | not))
      | .message.content
      | if type == "string" then .
        elif type == "array" then ([ .[] | select(.type == "text") | .text ] | join("\n"))
        else empty end
      | select(type == "string" and . != "")
      | select(test("^\\s*/") | not)
    ]
    | map(select(. != $current))
    | last // empty
  ' "$file" 2>/dev/null || printf ''
}

if [ -n "$sentinel" ]; then
  value=$(printf '%s' "$sentinel" | grep -ioE "($modes)" | tail -1 | tr '[:upper:]' '[:lower:]')

  if [ "$value" = 'focus' ]; then
    # Everything after the verb on the first line is the task. The sentinel has
    # already validated the shape, so stripping two leading tokens is exact and
    # avoids depending on a case-insensitive sed flag BSD sed may not have.
    task=$(printf '%s' "$first_line" \
      | sed -E 's@^[[:space:]]*/[^[:space:]]+[[:space:]]+[^[:space:]]+[[:space:]]*@@' \
      | sed -E 's/[[:space:]]+$//')
    derived=''
    if [ -z "$task" ]; then
      transcript=$(printf '%s' "$input" | jq -r '.transcript_path // empty' 2>/dev/null || printf '')
      task=$(previous_instruction "$transcript" "$prompt")
      derived='yes'
    fi
    # A pin long enough to crowd the turn is a pin nobody reads; the tail is
    # conversation the agent still has.
    if [ "${#task}" -gt 2000 ]; then
      task="${task:0:2000}… (truncated)"
    fi

    if ! bash "$script" set terse >/dev/null 2>&1; then
      printf 'WARNING: failed to persist mode via `%s`; the mode may be stale and no task was pinned. Tell the user.\n' "$sentinel"
    elif [ -z "$task" ]; then
      printf 'Mode already set to TERSE via `%s`, but there was no previous instruction to pin, so the session is UNPINNED. Do not run the script yourself. Say so in one line and ask what to pin.\n' "$sentinel"
    elif bash "$script" focus set "$task" >/dev/null 2>&1; then
      if [ -n "$derived" ]; then
        printf 'Focus mode already set via `%s` — TERSE, pinned to the previous instruction. Do not run the script yourself. Restate the pinned task in one line so the user can correct it, then work only on it.\n' "$sentinel"
      else
        printf 'Focus mode already set via `%s` — TERSE, pinned to the task on that line. Do not run the script yourself. Acknowledge in one short line, then start the task.\n' "$sentinel"
      fi
    else
      printf 'WARNING: mode is TERSE but the focus pin could not be written, so the session is UNPINNED. Tell the user.\n'
    fi
  elif bash "$script" set "$value" >/dev/null 2>&1; then
    printf 'Mode already set via `%s` (any focus pin is now cleared) — do not run the script yourself. Acknowledge the new mode in one short line; only treat the rest of the message as a task if it clearly contains one.\n' "$sentinel"
  else
    printf 'WARNING: failed to persist mode via `%s`; the mode may be stale. Tell the user.\n' "$sentinel"
  fi
fi

exec bash "$script" context
