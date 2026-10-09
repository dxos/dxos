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
# A run is PER SESSION. Its state lives in a directory keyed by the session id,
# outside any checkout, so concurrent sessions never see each other's runs and a
# session whose project dir is not a dxos checkout (a multi-repo cloud session
# rooted at the parent of both clones) keeps its run wherever it works. The
# directory is $AUTONOMOUS_STATE_DIR/<session>, defaulting to
# ${CLAUDE_CONFIG_DIR:-~/.claude}/autonomous/<session>. The session is
# $AUTONOMOUS_SESSION_ID (the hooks set it from the event's `session_id`), else
# $CLAUDE_CODE_SESSION_ID (what the agent's own Bash calls see). With neither,
# reads report inactive and writes are refused.
#
# Five files, because they have different writers:
#
#   task        the task           <- hook, from the raw `/autonomous` line
#   dod         definition of done <- the agent, once, before working
#   user.md     user's messages    <- hook, verbatim, append-only
#   log.md      decisions taken    <- the agent, as it takes them
#   reminders   Stop-block budget  <- the Stop hook
#
# The user log is written by the hook rather than the agent for the same reason
# the focus pin is derived in a hook: an agent asked to remember what the user
# said is persuasion, while a transcript on disk is evidence it can grep. It is
# the intended answer to a scoping question ("how big should this PR be?") —
# the user has almost always already said, somewhere upstream. The directory
# survives `stop`, so a session that has run once keeps feeding its user log
# between runs and a restart needs no backfill.
#
#   autonomous.sh get              -> print the task, or nothing when inactive
#   autonomous.sh active           -> exit 0 iff a task is pinned for this session
#   autonomous.sh dir              -> print this session's state directory
#   autonomous.sh set <task>       -> start (or replace) this session's run; resets dod, reminders
#   autonomous.sh dod get|set <text>
#   autonomous.sh log add <text>   -> append a timestamped decision
#   autonomous.sh log show [n]     -> tail the decision log
#   autonomous.sh user add <text>  -> append a user message (hook only)
#   autonomous.sh user show [n]    -> tail the user log
#   autonomous.sh reminders get|bump|reset
#   autonomous.sh stop <reason>    -> end the run; the reason is required and logged
#   autonomous.sh context          -> the block injected into every prompt
#   autonomous.sh point            -> stdin with `bash .claude/scripts/autonomous.sh` made absolute

set -euo pipefail

script_path="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/autonomous.sh"
session="${AUTONOMOUS_SESSION_ID:-${CLAUDE_CODE_SESSION_ID:-}}"
# A session id names a directory, so anything that could step outside the base is rejected.
case "$session" in *[!A-Za-z0-9_.-]* | . | ..) session='' ;; esac
base="${AUTONOMOUS_STATE_DIR:-${CLAUDE_CONFIG_DIR:-$HOME/.claude}/autonomous}"
state_dir="${session:+$base/$session}"
task_file="${state_dir:+$state_dir/task}"
dod_file="${state_dir:+$state_dir/dod}"
user_log="${state_dir:+$state_dir/user.md}"
decision_log="${state_dir:+$state_dir/log.md}"
reminders="${state_dir:+$state_dir/reminders}"

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

# Every mutating command needs a session to key its state on.
require_session() {
  [ -n "$state_dir" ] || {
    printf 'ERROR: no session id (AUTONOMOUS_SESSION_ID or CLAUDE_CODE_SESSION_ID); %s refused.\n' "$1" >&2
    exit 3
  }
  mkdir -p "$state_dir" 2>/dev/null || { printf 'ERROR: could not create %s\n' "$state_dir" >&2; exit 1; }
}

# The injected text spells every command as `bash .claude/scripts/autonomous.sh`;
# this rewrites it to this script's absolute path, so the agent's calls work from
# any cwd, including the parent of a multi-repo checkout.
point_at_script() {
  local text cmd
  text=$(cat)
  printf -v cmd 'bash %q' "$script_path"
  printf '%s\n' "${text//bash .claude\/scripts\/autonomous.sh/$cmd}"
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

# The block injected into the session's every prompt.
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
    ;;

  dir)
    [ -n "$state_dir" ] || exit 1
    printf '%s\n' "$state_dir"
    ;;

  set)
    text=$(truncate_text "${2:-}")
    [ -n "$text" ] || { printf 'usage: autonomous.sh set <task>\n' >&2; exit 2; }
    require_session 'set'
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
        require_session 'dod set'
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
        require_session 'log add'
        append_log "$decision_log" "$(printf -- '- %s: %s' "$(now)" "$text")" \
          || { printf 'ERROR: could not append to %s\n' "$decision_log" >&2; exit 1; }
        printf 'Logged.\n'
        ;;
      show)
        [ -n "$decision_log" ] && [ -e "$decision_log" ] || exit 0
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
        # Only a session that has started a run keeps a user log; any other
        # session must look exactly as it did before this feature existed.
        [ -n "$state_dir" ] && [ -d "$state_dir" ] || exit 0
        # Verbatim and unsummarised — the value of this log is that it is what
        # the user actually typed, not what the agent took from it. Fenced so a
        # message containing markdown cannot corrupt the file's structure.
        append_log "$user_log" "$(printf '\n### %s\n\n```\n%s\n```\n' "$(now)" "$text")" \
          || { printf 'ERROR: could not append to %s\n' "$user_log" >&2; exit 1; }
        ;;
      show)
        [ -n "$user_log" ] && [ -e "$user_log" ] || exit 0
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
        require_session 'reminders bump'
        value=$(read_file "$reminders" 2>/dev/null || printf '')
        case "$value" in ('' | *[!0-9]*) value=0 ;; esac
        value=$((value + 1))
        write_file "$reminders" "$value" || { printf 'ERROR: could not write %s\n' "$reminders" >&2; exit 1; }
        printf '%s\n' "$value"
        ;;
      reset) [ -z "$reminders" ] || rm -f "$reminders" 2>/dev/null || true ;;
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
    clear_run || { printf 'ERROR: could not clear autonomous state under %s\n' "$state_dir" >&2; exit 1; }
    printf 'Autonomous mode: OFF (%s)\n' "$reason"
    ;;

  context)
    task=$(current_task)
    [ -n "$task" ] || exit 0
    dod=$(current_dod)
    context_block "$task" "$dod" | point_at_script
    ;;

  point) point_at_script ;;

  *)
    printf 'usage: autonomous.sh {get|active|dir|point|set <task>|dod {get|set <text>}|log {add <text>|show [n]|path}|user {add <text>|show [n]|path}|reminders {get|bump|reset}|stop <reason>|context}\n' >&2
    exit 2
    ;;
esac
