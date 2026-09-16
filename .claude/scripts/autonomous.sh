#!/usr/bin/env bash
#
# Copyright 2026 DXOS.org
#
# State backend for AUTONOMOUS MODE — a pinned task the session must drive to a
# written definition of done without asking the user anything.
#
# It is deliberately shaped like ../scripts/mode.sh: a state script with two
# callers (`.claude/commands/autonomous.md` reports, the hooks mutate and
# inject), so the same read/write discipline applies — a file that exists but
# cannot be read is NOT the same as an absent one, and only the latter is safe
# to treat as "inactive".
#
# Four pieces of state, in four files, because they have four different writers:
#
#   .autonomous            the task           <- hook, from the raw `/autonomous` line
#   .autonomous-dod        definition of done <- the agent, once, before working
#   .autonomous-user.md    every user message <- hook, verbatim, append-only
#   .autonomous-log.md     decisions taken    <- the agent, as it takes them
#
# The user log is written by the hook rather than the agent for the same reason
# the focus pin is derived in a hook: an agent asked to remember what the user
# said is persuasion, while a transcript on disk is evidence it can grep. It is
# the intended answer to a scoping question ("how big should this PR be?") —
# the user has almost always already said, somewhere upstream.
#
#   autonomous.sh get              -> print the task, or nothing when inactive
#   autonomous.sh active           -> exit 0 iff a task is pinned
#   autonomous.sh set <task>       -> start (or replace) a run; resets dod, logs, reminders
#   autonomous.sh dod get|set <text>
#   autonomous.sh log add <text>   -> append a timestamped decision
#   autonomous.sh log show [n]     -> tail the decision log
#   autonomous.sh user add <text>  -> append a user message (hook only)
#   autonomous.sh user show [n]    -> tail the user log
#   autonomous.sh reminders get|bump|reset
#   autonomous.sh stop <reason>    -> end the run; the reason is required and logged
#   autonomous.sh context          -> the block injected into every prompt
#
# State is per-worktree runtime, not repo policy: every file is untracked and
# ignored via the root .gitignore.

set -euo pipefail

root="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
task_file="$root/.claude/.autonomous"
dod_file="$root/.claude/.autonomous-dod"
user_log="$root/.claude/.autonomous-user.md"
decision_log="$root/.claude/.autonomous-log.md"
reminders="$root/.claude/.autonomous-reminders"

# Cap on how long any single stored field may be. A pinned task or a log entry
# long enough to crowd the turn is one nobody reads.
max_len=4000

now() { date -u '+%Y-%m-%dT%H:%M:%SZ'; }

truncate_text() {
  local text=$1
  if [ "${#text}" -gt "$max_len" ]; then
    printf '%s… (truncated)' "${text:0:$max_len}"
  else
    printf '%s' "$text"
  fi
}

# Write via a temp file in the same directory so a reader never observes the
# truncate-then-write window and concludes the run is over.
write_file() {
  local target=$1 value=$2 tmp
  tmp=$(mktemp "$target.XXXXXX" 2>/dev/null) || return 1
  if printf '%s' "$value" > "$tmp" 2>/dev/null && mv -f "$tmp" "$target" 2>/dev/null; then
    return 0
  fi
  rm -f "$tmp" 2>/dev/null || true
  return 1
}

# Exists-but-unreadable exits 1 so mutating callers can refuse; absent prints
# nothing and succeeds.
read_file() {
  [ -e "$1" ] || return 0
  cat "$1" 2>/dev/null || return 1
}

# Read-only callers degrade to inactive rather than wedging the session into a
# task it can never leave.
current_task() {
  local value
  if ! value=$(read_file "$task_file"); then
    printf 'WARNING: %s exists but could not be read; treating the session as NOT autonomous.\n' "$task_file" >&2
    return 0
  fi
  printf '%s' "$value"
}

current_dod() { read_file "$dod_file" 2>/dev/null || printf ''; }

append_log() {
  local file=$1 entry=$2
  # A log that cannot be appended to is a silent loss of the audit trail, so
  # callers are told; the run itself is not aborted over it.
  printf '%s\n' "$entry" >> "$file" 2>/dev/null || return 1
}

clear_run() {
  rm -f "$task_file" "$dod_file" "$reminders" 2>/dev/null || return 1
  return 0
}

case "${1:-get}" in
  get)
    value=$(current_task)
    if [ -n "$value" ]; then printf '%s\n' "$value"; fi
    ;;

  active)
    [ -n "$(current_task)" ] || exit 1
    ;;

  set)
    text=$(truncate_text "${2:-}")
    [ -n "$text" ] || { printf 'usage: autonomous.sh set <task>\n' >&2; exit 2; }
    write_file "$task_file" "$text" || { printf 'ERROR: could not write %s\n' "$task_file" >&2; exit 1; }
    # A new run must not inherit the previous run's definition of done or
    # reminder budget; the logs are append-only history and are kept.
    rm -f "$dod_file" "$reminders" 2>/dev/null || true
    append_log "$decision_log" "$(printf '\n## Run started %s\n\n- TASK: %s\n' "$(now)" "$text")" \
      || printf 'WARNING: could not append to %s\n' "$decision_log" >&2
    printf 'Autonomous: %s\n' "$text"
    ;;

  dod)
    case "${2:-get}" in
      get)
        value=$(current_dod)
        if [ -n "$value" ]; then printf '%s\n' "$value"; fi
        ;;
      set)
        text=$(truncate_text "${3:-}")
        [ -n "$text" ] || { printf 'usage: autonomous.sh dod set <text>\n' >&2; exit 2; }
        write_file "$dod_file" "$text" || { printf 'ERROR: could not write %s\n' "$dod_file" >&2; exit 1; }
        append_log "$decision_log" "$(printf -- '- DOD %s: %s\n' "$(now)" "$text")" \
          || printf 'WARNING: could not append to %s\n' "$decision_log" >&2
        printf 'Definition of done: %s\n' "$text"
        ;;
      *) printf 'usage: autonomous.sh dod {get|set <text>}\n' >&2; exit 2 ;;
    esac
    ;;

  log)
    case "${2:-show}" in
      add)
        text=$(truncate_text "${3:-}")
        [ -n "$text" ] || { printf 'usage: autonomous.sh log add <text>\n' >&2; exit 2; }
        append_log "$decision_log" "$(printf -- '- %s: %s' "$(now)" "$text")" \
          || { printf 'ERROR: could not append to %s\n' "$decision_log" >&2; exit 1; }
        printf 'Logged.\n'
        ;;
      show)
        [ -e "$decision_log" ] || exit 0
        tail -n "${3:-40}" "$decision_log" 2>/dev/null || true
        ;;
      path) printf '%s\n' "$decision_log" ;;
      *) printf 'usage: autonomous.sh log {add <text>|show [n]|path}\n' >&2; exit 2 ;;
    esac
    ;;

  user)
    case "${2:-show}" in
      add)
        text=${3:-}
        [ -n "$text" ] || exit 0
        # Verbatim and unsummarised — the value of this log is that it is what
        # the user actually typed, not what the agent took from it. Fenced so a
        # message containing markdown cannot corrupt the file's structure.
        append_log "$user_log" "$(printf '\n### %s\n\n```\n%s\n```\n' "$(now)" "$text")" \
          || { printf 'ERROR: could not append to %s\n' "$user_log" >&2; exit 1; }
        ;;
      show)
        [ -e "$user_log" ] || exit 0
        tail -n "${3:-80}" "$user_log" 2>/dev/null || true
        ;;
      path) printf '%s\n' "$user_log" ;;
      *) printf 'usage: autonomous.sh user {add <text>|show [n]|path}\n' >&2; exit 2 ;;
    esac
    ;;

  reminders)
    case "${2:-get}" in
      get) printf '%s\n' "$(read_file "$reminders" 2>/dev/null || printf '')" ;;
      bump)
        value=$(read_file "$reminders" 2>/dev/null || printf '')
        case "$value" in ('' | *[!0-9]*) value=0 ;; esac
        value=$((value + 1))
        write_file "$reminders" "$value" || { printf 'ERROR: could not write %s\n' "$reminders" >&2; exit 1; }
        printf '%s\n' "$value"
        ;;
      reset) rm -f "$reminders" 2>/dev/null || true ;;
      *) printf 'usage: autonomous.sh reminders {get|bump|reset}\n' >&2; exit 2 ;;
    esac
    ;;

  stop)
    reason=$(truncate_text "${2:-}")
    # A run that ends without a recorded reason is indistinguishable from one
    # that was abandoned, which is the failure this whole mechanism exists to
    # prevent — so the reason is mandatory.
    [ -n "$reason" ] || { printf 'usage: autonomous.sh stop <reason>\n' >&2; exit 2; }
    if [ -z "$(current_task)" ]; then
      printf 'Autonomous mode was not active.\n'
      exit 0
    fi
    append_log "$decision_log" "$(printf -- '- STOP %s: %s\n' "$(now)" "$reason")" \
      || printf 'WARNING: could not append to %s\n' "$decision_log" >&2
    clear_run || { printf 'ERROR: could not clear autonomous state under %s/.claude\n' "$root" >&2; exit 1; }
    printf 'Autonomous mode: OFF (%s)\n' "$reason"
    ;;

  context)
    task=$(current_task)
    [ -n "$task" ] || exit 0
    dod=$(current_dod)
    printf 'AUTONOMOUS MODE (re-injected every turn; this governs the WORK, not the reply).\n'
    printf -- '- TASK: %s\n' "$task"
    if [ -n "$dod" ]; then
      printf -- '- DEFINITION OF DONE: %s\n' "$dod"
    else
      cat <<'EOF'
- DEFINITION OF DONE: NOT YET WRITTEN. Before anything else, write one as a
  short checklist of verifiable conditions (what builds, what passes, what a
  reviewer can see) and store it:
  `bash .claude/scripts/autonomous.sh dod set '<checklist>'`
EOF
    fi
    cat <<'EOF'
- DO NOT ASK THE USER ANYTHING. No clarifying questions, no confirmations, no
  menus of options. Pick the option that best advances the task, state the
  choice, and proceed. Ambiguity is resolved by evidence, in this order:
  1. the user log — `bash .claude/scripts/autonomous.sh user show` — which is
     every message the user has sent, verbatim. Scope and PR-size questions are
     almost always already answered there; grep it before deciding anything
     about what is in or out of this change.
  2. the repo itself (AGENTS.md, the relevant skill, existing code and tests).
  3. the most reversible option that keeps the task moving.
- LOG EVERY NON-OBVIOUS DECISION, as you take it, one line each:
  `bash .claude/scripts/autonomous.sh log add '<decision> — <why>'`
- A BLOCKER IS WORK, NOT AN EXIT. Try at least two independent routes around it
  (a different tool, a narrower scope that still satisfies the DoD, reading the
  failing code, a fallback documented in the relevant skill) and log each
  attempt before concluding anything is impossible.
- FINISH THE WHOLE TASK against the definition of done — every item, tested,
  formatted, committed. Partial work is not done.
- BEFORE STOPPING, run an adversarial review of your own diff: re-read it
  looking for what a hostile reviewer or CI would reject, and fix what you find.
  `/code-review` or the `agentic-review` skill counts; so does a subagent asked
  to attack the change. Log the verdict.
- STOPPING IS EXPLICIT AND HAS EXACTLY TWO GROUNDS: the DoD is fully met, or
  you have established and logged that no route exists. Either way, end the run
  yourself first — `bash .claude/scripts/autonomous.sh stop '<which ground, and why>'`
  — or the Stop hook will hand this task straight back to you.
- This does NOT override safety: destructive or irreversible actions outside the
  task, and the AGENTS.md non-negotiables (never edit on main, never create or
  switch worktrees/branches, no casts to silence the type-checker, never
  suppress unhandled errors, format before committing) still bind. If the task
  itself requires crossing one of those, stop with that as the logged reason.
EOF
    ;;

  *)
    printf 'usage: autonomous.sh {get|active|set <task>|dod {get|set <text>}|log {add <text>|show [n]}|user {add <text>|show [n]}|reminders {get|bump|reset}|stop <reason>|context}\n' >&2
    exit 2
    ;;
esac
