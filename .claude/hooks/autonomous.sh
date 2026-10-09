#!/usr/bin/env bash
#
# Copyright 2026 DXOS.org
#
# UserPromptSubmit hook for AUTONOMOUS MODE. Three jobs, in order:
#
# 1. Toggle: `/autonomous [task]` starts (or replaces) this session's run,
#    `/autonomous off` ends it. This event carries the RAW typed text and runs
#    before the model, so the write is deterministic — the command's own
#    expansion would land too late to gate the turn it appears in.
# 2. Log the user's message verbatim, into this session's own state. Doing this
#    here, mechanically, is the whole point: the agent is told not to ask
#    questions, so it needs evidence of what the user already said — especially
#    about scope and PR size — and an agent asked to remember that would be
#    persuasion, not a record. A session that starts its first run backfills
#    the log from its own transcript.
# 3. Enforce: inject the autonomous directives while this session's run is
#    active. State is per session (see ../scripts/autonomous.sh), so other
#    sessions — in this checkout or any other — are untouched.
#
# Deliberately a sibling of ./mode.sh rather than part of it: verbosity and
# autonomy are independent (a run can be terse or normal), and two hooks under
# one settings.json key both fire.

set -euo pipefail

# Resolved from this file, not CLAUDE_PROJECT_DIR, so the dxos plugin can run it
# in a session whose project dir is not this checkout.
script="$(cd "$(dirname "${BASH_SOURCE[0]}")/../scripts" && pwd)/autonomous.sh"

input=$(cat)
prompt=$(printf '%s' "$input" | jq -r '.prompt // empty' 2>/dev/null || printf '')
transcript=$(printf '%s' "$input" | jq -r '.transcript_path // empty' 2>/dev/null || printf '')
session_id=$(printf '%s' "$input" | jq -r '.session_id // empty' 2>/dev/null || printf '')
if [ -n "$session_id" ]; then
  export AUTONOMOUS_SESSION_ID="$session_id"
fi

# Every message the user typed, oldest first, NUL-terminated so a multi-line
# message stays one entry, excluding this turn's own prompt. Used to seed the
# user log when a run starts partway through a session. Where the transcript
# marks turn origins, only `human` turns and prompts typed mid-turn
# (`queued_command` attachments) count: task notifications, skill bodies and
# command expansions are user-role turns too, and must not be pinned as a task.
prior_user_messages() {
  local file=$1 current=$2
  [ -f "$file" ] || return 0
  jq -js --arg current "$current" '
    def text: if type == "string" then .
      elif type == "array" then ([ .[] | select(.type == "text") | .text ] | join("\n"))
      else "" end;
    (any(.[]; .type == "user" and has("origin"))) as $marked
    | [ .[]
        | if .type == "user" and (.isMeta | not)
            and (($marked | not) or .origin.kind == "human")
          then .message.content | text
          elif .type == "attachment" and .attachment.type == "queued_command"
            and .attachment.commandMode == "prompt"
          then .attachment.prompt | text
          else empty end
        | select(. != "" and . != $current)
      ]
    | .[-50:]
    | .[]
    | . + "\u0000"
  ' "$file" 2>/dev/null || printf ''
}

# The last user instruction that is not this turn's prompt and not a slash
# command (typed, or as the transcript records its expansion) — i.e. what a
# bare `/autonomous` means to pin.
previous_instruction() {
  local file=$1 current=$2 message trimmed last=''
  [ -f "$file" ] || return 0
  while IFS= read -r -d '' message; do
    trimmed=${message#"${message%%[![:space:]]*}"}
    case "$trimmed" in
      /* | '<command-message>'* | '<command-name>'*) ;;
      *) last=$message ;;
    esac
  done < <(prior_user_messages "$file" "$current")
  printf '%s' "$last"
}

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
      if [ -z "$(bash "$script" get 2>/dev/null)" ]; then
        printf 'Autonomous mode was not active. Say so in one line.\n'
      elif bash "$script" stop "$reason" >/dev/null 2>&1; then
        printf 'Autonomous mode is now OFF (recorded in the decision log). Do not run the script yourself. Confirm in one line, and report where the task stands.\n'
      else
        printf 'Autonomous mode state could not be cleared, so the run is still ON. Say so in one line.\n'
      fi
      ;;
    status)
      printf 'Autonomous status was requested. Report it from the AUTONOMOUS MODE block below (or say it is off if no block follows) plus `bash .claude/scripts/autonomous.sh log show`.\n' \
        | bash "$script" point
      ;;
    *)
      task=$args
      derived=''
      if [ -z "$task" ]; then
        task=$(previous_instruction "$transcript" "$prompt")
        derived='yes'
      fi

      # A session that has run before has been feeding its user log, so it
      # needs no backfill.
      user_log=$(bash "$script" user path 2>/dev/null || printf '')
      has_log=''
      if [ -n "$user_log" ] && [ -e "$user_log" ]; then has_log='yes'; fi

      if [ -z "$task" ]; then
        printf 'AUTONOMOUS MODE was requested with no task on the line and no previous instruction to adopt, so NOTHING was started. Do not run the script yourself. Say so in one line and ask what the task is.\n'
      elif bash "$script" set "$task" >/dev/null 2>&1; then
        # Seed the user log from this session's transcript on its first run, so
        # the first scoping decision has the same evidence a long-running run
        # would, without re-appending turns already on disk.
        if [ -z "$has_log" ]; then
          while IFS= read -r -d '' message; do
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

# 2. Record the message. `user add` drops it unless this session has run before.
#    A failure here must not swallow the turn, so the warning is surfaced and
#    the hook carries on.
if [ -n "$prompt" ]; then
  bash "$script" user add "$prompt" >/dev/null 2>&1 \
    || printf 'WARNING: could not append this message to the autonomous user log.\n'
fi

# A new user turn resets the stop-reminder budget: the hook's job is to stop an
# agent walking away from a task, not to fight a user who has retaken the wheel.
if bash "$script" active >/dev/null 2>&1; then
  bash "$script" reminders reset >/dev/null 2>&1 || true
fi

# 3. Inert unless this session has an active run — any other session must look
#    exactly as it did before this hook existed.
exec bash "$script" context
