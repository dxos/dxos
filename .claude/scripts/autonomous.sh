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
# Five pieces of state, in five files, because they have different writers:
#
#   .autonomous            the task           <- hook, from the raw `/autonomous` line
#   .autonomous-session    owning session id  <- hook, alongside the task
#   .autonomous-dod        definition of done <- the agent, once, before working
#   .autonomous-user.md    owner's messages   <- hook, verbatim, append-only
#   .autonomous-log.md     decisions taken    <- the agent, as it takes them
#
# A run belongs to the session that started it. Every session whose project dir
# is this checkout reads these files, including sessions in other worktrees that
# point CLAUDE_PROJECT_DIR here, so the hooks inject the block, block Stop, and
# log user messages only for the owning session. The current session is
# $AUTONOMOUS_SESSION_ID (the hooks set it from the event's `session_id`), else
# $CLAUDE_CODE_SESSION_ID (what the agent's own Bash calls see). Ownership is
# denied only on evidence: a run with no recorded owner (started before scoping,
# or by a caller with no session id), an owner file that exists but cannot be
# read, or an unknown current session all count as owned here. The owner file
# survives `stop`, so the last owner keeps feeding the user log between runs and
# a restart in the same session needs no backfill. Starting a run from another
# session takes it over; `stop` and `dod set` from another session are refused.
#
# The user log is written by the hook rather than the agent for the same reason
# the focus pin is derived in a hook: an agent asked to remember what the user
# said is persuasion, while a transcript on disk is evidence it can grep. It is
# the intended answer to a scoping question ("how big should this PR be?") —
# the user has almost always already said, somewhere upstream.
#
#   autonomous.sh get              -> print the task, or nothing when inactive (any owner)
#   autonomous.sh active           -> exit 0 iff a task is pinned and owned by this session
#   autonomous.sh owner            -> print the owning session id, if recorded
#   autonomous.sh set <task>       -> start (or take over) a run for this session; resets dod, reminders
#   autonomous.sh dod get|set <text>
#   autonomous.sh log add <text>   -> append a timestamped decision
#   autonomous.sh log show [n]     -> tail the decision log
#   autonomous.sh user add <text>  -> append a user message from the owner (hook only)
#   autonomous.sh user show [n]    -> tail the user log
#   autonomous.sh reminders get|bump|reset
#   autonomous.sh stop <reason>    -> end the run; the reason is required and logged
#   autonomous.sh context          -> the block injected into every prompt of the owner
#   autonomous.sh point            -> stdin with `bash .claude/scripts/autonomous.sh` made absolute
#
# The state lives under $CLAUDE_PROJECT_DIR when set (always, for the hooks),
# else under the checkout containing this script. Sessions whose cwd is a
# worktree but whose project dir is the main checkout therefore need the
# absolute script path, which `context`, `point` and the Stop hook print.
#
# State is per-checkout runtime, not repo policy: every file is untracked and
# ignored via the root .gitignore.

set -euo pipefail

# The hooks pass CLAUDE_PROJECT_DIR; the agent's Bash calls often lack it, so
# they fall back to the checkout holding this script, which is the one the
# injected commands name. Its cwd may be a different worktree.
root="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
task_file="$root/.claude/.autonomous"
owner_file="$root/.claude/.autonomous-session"
dod_file="$root/.claude/.autonomous-dod"
user_log="$root/.claude/.autonomous-user.md"
decision_log="$root/.claude/.autonomous-log.md"
reminders="$root/.claude/.autonomous-reminders"

session="${AUTONOMOUS_SESSION_ID:-${CLAUDE_CODE_SESSION_ID:-}}"

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

# Whether this session may act on the run. Only a readable owner that differs
# from a known current session says no.
owned_here() {
  local owner
  owner=$(read_file "$owner_file") || return 0
  [ -n "$owner" ] && [ -n "$session" ] || return 0
  [ "$owner" = "$session" ]
}

# Stricter than owned_here: with no run active there is no one to give the
# benefit of the doubt to, so only a recorded, matching owner logs.
logs_here() {
  local owner
  if [ -n "$(current_task 2>/dev/null)" ]; then
    owned_here
    return
  fi
  owner=$(read_file "$owner_file" 2>/dev/null) || return 1
  [ -n "$owner" ] && [ "$owner" = "$session" ]
}

# The injected text spells every command as `bash .claude/scripts/autonomous.sh`;
# this rewrites it to the absolute script under $root, so the agent's calls land
# on the state the hooks read even when its cwd is another worktree.
point_at_root() {
  local text cmd
  text=$(cat)
  printf -v cmd 'bash %q' "$root/.claude/scripts/autonomous.sh"
  printf '%s\n' "${text//bash .claude\/scripts\/autonomous.sh/$cmd}"
}

refuse_foreign() {
  printf 'ERROR: the autonomous run belongs to session %s, not this one (%s); %s refused.\n' \
    "$(read_file "$owner_file" 2>/dev/null)" "${session:-unknown}" "$1" >&2
  exit 3
}

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

# The block injected into the owner's every prompt.
context_block() {
  local task=$1 dod=$2
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
}

case "${1:-get}" in
  get)
    value=$(current_task)
    if [ -n "$value" ]; then printf '%s\n' "$value"; fi
    ;;

  active)
    [ -n "$(current_task)" ] || exit 1
    owned_here || exit 1
    ;;

  owner)
    value=$(read_file "$owner_file") || { printf 'ERROR: %s exists but could not be read\n' "$owner_file" >&2; exit 1; }
    if [ -n "$value" ]; then printf '%s\n' "$value"; fi
    ;;

  set)
    text=$(truncate_text "${2:-}")
    [ -n "$text" ] || { printf 'usage: autonomous.sh set <task>\n' >&2; exit 2; }
    # Owner before task, so no reader pairs the new task with the old owner.
    if [ -n "$session" ]; then
      write_file "$owner_file" "$session" || { printf 'ERROR: could not write %s\n' "$owner_file" >&2; exit 1; }
    else
      rm -f "$owner_file" 2>/dev/null || { printf 'ERROR: could not clear %s\n' "$owner_file" >&2; exit 1; }
    fi
    write_file "$task_file" "$text" || { printf 'ERROR: could not write %s\n' "$task_file" >&2; exit 1; }
    # A new run must not inherit the previous run's definition of done or
    # reminder budget; the logs are append-only history and are kept.
    rm -f "$dod_file" "$reminders" 2>/dev/null || true
    append_log "$decision_log" "$(printf '\n## Run started %s (session %s)\n\n- TASK: %s\n' "$(now)" "${session:-unknown}" "$text")" \
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
        [ -z "$(current_task)" ] || owned_here || refuse_foreign 'dod set'
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
        logs_here || exit 0
        # Verbatim and unsummarised — the value of this log is that it is what
        # the user actually typed, not what the agent took from it. Fenced so a
        # message containing markdown cannot corrupt the file's structure.
        append_log "$user_log" "$(printf '\n### %s (session %s)\n\n```\n%s\n```\n' "$(now)" "${session:-unknown}" "$text")" \
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
    owned_here || refuse_foreign 'stop'
    append_log "$decision_log" "$(printf -- '- STOP %s: %s\n' "$(now)" "$reason")" \
      || printf 'WARNING: could not append to %s\n' "$decision_log" >&2
    clear_run || { printf 'ERROR: could not clear autonomous state under %s/.claude\n' "$root" >&2; exit 1; }
    printf 'Autonomous mode: OFF (%s)\n' "$reason"
    ;;

  context)
    task=$(current_task)
    [ -n "$task" ] || exit 0
    owned_here || exit 0
    dod=$(current_dod)
    context_block "$task" "$dod" | point_at_root
    ;;

  point) point_at_root ;;

  *)
    printf 'usage: autonomous.sh {get|active|owner|point|set <task>|dod {get|set <text>}|log {add <text>|show [n]}|user {add <text>|show [n]}|reminders {get|bump|reset}|stop <reason>|context}\n' >&2
    exit 2
    ;;
esac
