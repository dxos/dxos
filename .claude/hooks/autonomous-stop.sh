#!/usr/bin/env bash
#
# Copyright 2026 DXOS.org
#
# Stop hook for AUTONOMOUS MODE. While a run is active, ending the turn is
# treated as an unfinished task: the hook blocks the stop and hands the task
# back with the definition of done attached.
#
# This is the mechanism half of the feature. Every other part is text the agent
# may drift away from as the session fills (see .claude/README.md §A); this one
# fires at the moment the drift becomes visible — the agent trying to stop.
#
# The legitimate exits are NOT blocked, because they clear the state first:
# `autonomous.sh stop <reason>` (DoD met, or no route exists, logged either way)
# and `/autonomous off` from the user. With no state, this hook sees nothing to
# do and the turn ends normally.
#
# Bounded on purpose. `reminders` counts blocks and is reset by every
# UserPromptSubmit, so a run can be nudged at most $cap times per user turn.
# An unbounded Stop block is an infinite loop: the agent cannot be argued into a
# capability it does not have, and a session that can never end is worse than a
# task reported unfinished.

set -euo pipefail

root="${CLAUDE_PROJECT_DIR:-$(pwd)}"
script="$root/.claude/scripts/autonomous.sh"
cap=3

input=$(cat)
stop_hook_active=$(printf '%s' "$input" | jq -r '.stop_hook_active // false' 2>/dev/null || printf 'false')

bash "$script" active >/dev/null 2>&1 || exit 0

task=$(bash "$script" get 2>/dev/null || printf '')
dod=$(bash "$script" dod get 2>/dev/null || printf '')
count=$(bash "$script" reminders bump 2>/dev/null || printf '%s' "$cap")
case "$count" in ('' | *[!0-9]*) count=$cap ;; esac

# Out of budget: let the turn end, but tell the USER the run is still open —
# systemMessage reaches them, and a run abandoned silently is the failure mode
# this hook exists to make visible.
if [ "$count" -gt "$cap" ]; then
  jq -nc --arg task "$task" \
    '{systemMessage: ("AUTONOMOUS MODE is still ON and the agent stopped after \($task | .[0:120]) — reminder budget spent for this turn. Say `/autonomous off` to end the run, or reply to resume it.")}'
  exit 0
fi

if [ -n "$dod" ]; then
  dod_line="Definition of done (yours, from earlier in this run): $dod"
else
  dod_line="You never wrote a definition of done. Write one now and store it with \`bash .claude/scripts/autonomous.sh dod set '<checklist>'\`."
fi

# `stop_hook_active` means this turn is already a continuation of a previous
# block, so the reminder is trimmed to the decision rather than repeating the
# doctrine the agent has just been given.
if [ "$stop_hook_active" = 'true' ]; then
  reason=$(printf 'AUTONOMOUS MODE is still ON.\n\nTASK: %s\n%s\n\nYou stopped again without ending the run. Do exactly one of these, now:\n1. Keep working — the next unfinished item of the definition of done.\n2. If every item is met: run the adversarial review of your diff, fix what it finds, then `bash .claude/scripts/autonomous.sh stop "done: <what was verified>"`.\n3. If no route exists: log the routes you tried, then `bash .claude/scripts/autonomous.sh stop "blocked: <what, and the two routes that failed>"`.\n' "$task" "$dod_line")
else
  reason=$(printf 'AUTONOMOUS MODE is still ON — you cannot end the turn by going quiet.\n\nTASK: %s\n%s\n\nDo NOT ask the user a question to get out of this. Resolve ambiguity from evidence:\n- `bash .claude/scripts/autonomous.sh user show` — every message the user has sent, verbatim. Scope and PR-size questions are answered there.\n- the repo: AGENTS.md, the relevant skill, existing code and tests.\n\nThen take the next step:\n1. Any DoD item unmet -> keep working on it. A blocker is work: try two independent routes around it and `autonomous.sh log add` each attempt.\n2. All items met -> run an adversarial review of your own diff first (`/code-review`, the `agentic-review` skill, or a subagent asked to attack the change), fix what it finds, log the verdict, then end the run:\n   `bash .claude/scripts/autonomous.sh stop "done: <what was verified>"`\n3. Genuinely no route -> log what you tried and end the run:\n   `bash .claude/scripts/autonomous.sh stop "blocked: <what, and the routes that failed>"`\n\nEnding the run via that command is the ONLY clean exit; it clears the state so this hook stops firing. Reminder %s of %s for this turn.\n' "$task" "$dod_line" "$count" "$cap")
fi

jq -nc --arg reason "$reason" '{decision: "block", reason: $reason}'
