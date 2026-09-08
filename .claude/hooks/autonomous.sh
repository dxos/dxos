#!/usr/bin/env bash
#
# Copyright 2026 DXOS.org
#
# UserPromptSubmit hook for AUTONOMOUS MODE. Three jobs, in order:
#
# 1. Log the user's message verbatim. Doing this here, mechanically, is the
#    whole point: the agent is told not to ask questions, so it needs evidence
#    of what the user already said — especially about scope and PR size — and an
#    agent asked to remember that would be persuasion, not a record.
#    This happens on EVERY turn, autonomous or not, so a run started mid-session
#    already has its upstream context on disk.
# 2. Toggle: `/autonomous [task]` starts a run, `/autonomous off` ends one. This
#    event carries the RAW typed text and runs before the model, so the write is
#    deterministic — the command's own expansion would land too late to gate the
#    turn it appears in.
# 3. Enforce: inject the autonomous directives, but only while a run is active.
#
# Deliberately a sibling of ./mode.sh rather than part of it: verbosity and
# autonomy are independent (a run can be terse or normal), and two hooks under
# one settings.json key both fire.

set -euo pipefail

root="${CLAUDE_PROJECT_DIR:-$(pwd)}"
script="$root/.claude/scripts/autonomous.sh"
user_log="$root/.claude/.autonomous-user.md"

# Whether the user log predates this turn, captured BEFORE step 1 appends to it:
# a log that already exists has been fed by this hook since the session began, so
# a run starting now needs no backfill and would only duplicate its own tail.
seeded='no'
[ -e "$user_log" ] && seeded='yes'

input=$(cat)
prompt=$(printf '%s' "$input" | jq -r '.prompt // empty' 2>/dev/null || printf '')
transcript=$(printf '%s' "$input" | jq -r '.transcript_path // empty' 2>/dev/null || printf '')

# Every user message the transcript holds, oldest first, excluding tool results,
# harness meta turns, and this turn's own prompt. Used to seed the user log when
# a run starts partway through a session.
prior_user_messages() {
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
    ]
    | map(select(. != $current))
    | .[-50:]
    | .[]
  ' "$file" 2>/dev/null || printf ''
}

# The last user instruction that is not this turn's prompt and not a slash
# command — i.e. what a bare `/autonomous` means to pin.
previous_instruction() {
  local file=$1 current=$2
  [ -f "$file" ] || return 0
  prior_user_messages "$file" "$current" | grep -v '^[[:space:]]*/' | tail -1 || printf ''
}

# 1. Record the message. A failure here must not swallow the turn, so the
#    warning is surfaced and the hook carries on.
if [ -n "$prompt" ]; then
  bash "$script" user add "$prompt" >/dev/null 2>&1 \
    || printf 'WARNING: could not append this message to the autonomous user log.\n'
fi

# A new user turn resets the stop-reminder budget: the hook's job is to stop an
# agent walking away from a task, not to fight a user who has retaken the wheel.
bash "$script" reminders reset >/dev/null 2>&1 || true

# `/autonomous …`, leading, as a slash command must be. Anchoring to the first
# line is what keeps prose about the command — or a path like `src/autonomous
# off.ts` — from starting a run. The trailing boundary is required: without it
# `/autonomousx` prefix-matches.
first_line=$(printf '%s' "$prompt" | head -1)
sentinel=$(printf '%s\n' "$first_line" | grep -ioE "^[[:space:]]*/autonomous([[:space:]]|$)" | head -1 || true)

if [ -n "$sentinel" ]; then
  args=$(printf '%s' "$first_line" \
    | sed -E 's@^[[:space:]]*/[^[:space:]]+[[:space:]]*@@' \
    | sed -E 's/[[:space:]]+$//')
  verb=$(printf '%s' "$args" | awk '{print tolower($1)}')

  case "$verb" in
    off | stop | end)
      reason=$(printf '%s' "$args" | sed -E 's@^[^[:space:]]+[[:space:]]*@@')
      [ -n "$reason" ] || reason='stopped by the user'
      if bash "$script" stop "$reason" >/dev/null 2>&1; then
        printf 'Autonomous mode is now OFF (recorded in the decision log). Do not run the script yourself. Confirm in one line, and report where the task stands.\n'
      else
        printf 'Autonomous mode was not active, or its state could not be cleared. Say which in one line.\n'
      fi
      ;;
    status)
      printf 'Autonomous status was requested. Report it from the AUTONOMOUS MODE block below (or say it is off if no block follows) plus `bash .claude/scripts/autonomous.sh log show`.\n'
      ;;
    *)
      task=$args
      derived=''
      if [ -z "$task" ]; then
        task=$(previous_instruction "$transcript" "$prompt")
        derived='yes'
      fi

      if [ -z "$task" ]; then
        printf 'AUTONOMOUS MODE was requested with no task on the line and no previous instruction to adopt, so NOTHING was started. Do not run the script yourself. Say so in one line and ask what the task is.\n'
      elif bash "$script" set "$task" >/dev/null 2>&1; then
        # Seed the user log from the transcript, but only when this hook was not
        # already logging this session — so the first scoping decision of a run
        # started in a fresh session has the same evidence a long-running one
        # would, without re-appending turns already on disk.
        if [ "$seeded" = 'no' ]; then
          while IFS= read -r message; do
            [ -n "$message" ] || continue
            bash "$script" user add "$message" >/dev/null 2>&1 || true
          done < <(prior_user_messages "$transcript" "$prompt")
        fi

        if [ -n "$derived" ]; then
          printf 'AUTONOMOUS MODE is now ON, with the task adopted from your previous instruction. Do not run the script yourself. Restate the task and your definition of done in one short block, store the DoD with `autonomous.sh dod set`, then work it to completion without asking anything further.\n'
        else
          printf 'AUTONOMOUS MODE is now ON with the task on that line. Do not run the script yourself. State your definition of done in one short block, store it with `autonomous.sh dod set`, then work it to completion without asking anything further.\n'
        fi
      else
        printf 'WARNING: AUTONOMOUS MODE could not be started (state write failed), so the session is NOT autonomous. Tell the user.\n'
      fi
      ;;
  esac
fi

# 3. Inert when no run is active — a non-autonomous session must look exactly as
#    it did before this hook existed.
exec bash "$script" context
