#!/usr/bin/env bash
#
# Copyright 2026 DXOS.org
#
# State backend for the response-verbosity mode. `concise` aliases terse;
# `natural`/`default`/`off` alias normal.
#
# The mode carries a second, optional piece of state: a FOCUS PIN — a single
# task the session is confined to. `focus` is not a third mode value; it is
# `terse` plus a pinned task, so every reader of the mode itself is unchanged
# and the pin is simply the existence of `.claude/.focus`. Any write to the mode
# clears the pin: choosing a verbosity IS how you leave focus.
#
# Two callers, which is why this is separate from ../hooks/mode.sh (the
# UserPromptSubmit adapter that parses stdin JSON): `.claude/commands/mode.md`
# runs `get` to report, and the adapter runs `set`/`context`. It is also
# hand-runnable — `bash .claude/scripts/mode.sh get|context` — for checking what
# a turn will actually be told, without going through a hook.
#
#   mode.sh get         -> print current mode (terse|normal)
#   mode.sh toggle      -> flip the mode, print the new mode
#   mode.sh set <mode>  -> set the mode; clears any focus pin
#   mode.sh focus get   -> print the pinned task, or nothing when unpinned
#   mode.sh focus set <text>
#                       -> pin a task (does NOT touch the mode; the caller sets
#                          terse first, so a failed pin leaves the session
#                          unpinned rather than stale)
#   mode.sh focus clear -> remove the pin
#   mode.sh context     -> print the response rules injected into each prompt; the
#                       invariants are emitted in BOTH modes, only the length
#                       clause varies. Never silent — a mode that says nothing
#                       in its default state is the bug this replaced.
#
# State is per-user runtime, not repo policy: it lives in an untracked file and
# must stay out of git (ignored via the root .gitignore).

set -euo pipefail

root="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
state="$root/.claude/.mode"
focus="$root/.claude/.focus"
legacy="$root/.claude/.response-mode"

canonical() {
  case "$1" in
    terse | concise) printf 'terse' ;;
    *) printf 'normal' ;;
  esac
}

# Print the raw stored value; exit 1 when the file exists but cannot be read, so
# callers can tell "no state" (safe to default) from "unknown state" (never safe
# to overwrite or to discard the legacy copy).
read_state() {
  [ -e "$state" ] || return 0
  cat "$state" 2>/dev/null || return 1
}

# Write via a temp file in the same directory so readers never observe the
# truncate-then-write window and silently fall back to normal for a turn.
write_file() {
  local target=$1 value=$2 tmp
  tmp=$(mktemp "$target.XXXXXX" 2>/dev/null) || return 1
  if printf '%s' "$value" > "$tmp" 2>/dev/null && mv -f "$tmp" "$target" 2>/dev/null; then
    return 0
  fi
  rm -f "$tmp" 2>/dev/null || true
  return 1
}

write_state() { write_file "$state" "$1"; }

# Same read discipline as the mode: exists-but-unreadable is distinct from
# absent, because only the latter is safe to treat as "no pin".
read_focus() {
  [ -e "$focus" ] || return 0
  cat "$focus" 2>/dev/null || return 1
}

# Read-only callers degrade to unpinned so a corrupt file cannot wedge the
# session into a task it can never leave.
current_focus() {
  local value
  if ! value=$(read_focus); then
    printf 'WARNING: %s exists but could not be read; treating the session as unpinned.\n' "$focus" >&2
    return 0
  fi
  printf '%s' "$value"
}

clear_focus() {
  [ -e "$focus" ] || return 0
  rm -f "$focus" 2>/dev/null
}

# Transitional: the state file was renamed alongside the script, so adopt an
# existing value once and drop the old file — otherwise checkouts that predate
# the rename silently reset to normal and leave the stale file untracked. The
# legacy file is unlinked only once its value is safely stored canonically; a
# failed read or write must not destroy the mode it was carrying.
if [ -e "$legacy" ]; then
  if ! legacy_value=$(cat "$legacy" 2>/dev/null); then
    printf 'WARNING: could not read %s; leaving it in place.\n' "$legacy" >&2
  elif ! state_value=$(read_state); then
    printf 'WARNING: %s could not be read; leaving %s in place.\n' "$state" "$legacy" >&2
  elif [ -n "$state_value" ]; then
    rm -f "$legacy" 2>/dev/null || true
  elif write_state "$(canonical "$legacy_value")"; then
    rm -f "$legacy" 2>/dev/null || true
  else
    printf 'WARNING: could not migrate %s to %s; leaving it in place.\n' "$legacy" "$state" >&2
  fi
fi

# Canonicalise on read so a stale or hand-edited state file cannot wedge the
# machine in an unrecognised mode — anything that is not terse means normal.
# Read-only callers degrade to normal so the hook keeps injecting the rules even
# when state is unreadable; mutating callers must use read_state and refuse.
current() {
  local value
  if ! value=$(read_state); then
    printf 'WARNING: %s exists but could not be read; using normal.\n' "$state" >&2
    value=''
  fi
  canonical "$value"
}

case "${1:-get}" in
  get)
    current; printf '\n'
    ;;
  toggle)
    # Strict read: flipping from an assumed normal would clobber an unknown
    # state, and would look like a no-op if the stored mode was already terse.
    if ! value=$(read_state); then
      printf 'ERROR: %s exists but could not be read; refusing to overwrite it.\n' "$state" >&2
      exit 1
    fi
    if [ "$(canonical "$value")" = 'terse' ]; then next='normal'; else next='terse'; fi
    write_state "$next" || { printf 'ERROR: could not write %s\n' "$state" >&2; exit 1; }
    clear_focus || { printf 'ERROR: could not clear %s\n' "$focus" >&2; exit 1; }
    printf 'Mode: %s\n' "$(printf '%s' "$next" | tr '[:lower:]' '[:upper:]')"
    ;;
  set)
    case "${2:-}" in
      terse | concise) next='terse' ;;
      normal | natural | default | off) next='normal' ;;
      *) printf 'usage: mode.sh set {terse|normal}\n' >&2; exit 2 ;;
    esac
    write_state "$next" || { printf 'ERROR: could not write %s\n' "$state" >&2; exit 1; }
    # Naming a verbosity IS how you leave focus, so the pin goes with it — and it
    # goes AFTER the mode write, so a half-applied change ends unpinned.
    clear_focus || { printf 'ERROR: could not clear %s\n' "$focus" >&2; exit 1; }
    printf 'Mode: %s\n' "$(printf '%s' "$next" | tr '[:lower:]' '[:upper:]')"
    ;;
  focus)
    case "${2:-get}" in
      get)
        # An unpinned session prints nothing and still succeeds — `set -e` would
        # turn a bare `[ -n … ] && printf` into a spurious failure for callers
        # that chain this after other commands.
        value=$(current_focus)
        if [ -n "$value" ]; then printf '%s\n' "$value"; fi
        ;;
      set)
        text=${3:-}
        [ -n "$text" ] || { printf 'usage: mode.sh focus set <text>\n' >&2; exit 2; }
        write_file "$focus" "$text" || { printf 'ERROR: could not write %s\n' "$focus" >&2; exit 1; }
        printf 'Focus: %s\n' "$text"
        ;;
      clear)
        clear_focus || { printf 'ERROR: could not clear %s\n' "$focus" >&2; exit 1; }
        printf 'Focus: cleared\n'
        ;;
      *) printf 'usage: mode.sh focus {get|set <text>|clear}\n' >&2; exit 2 ;;
    esac
    ;;
  context)
    # Emitted in BOTH modes. The invariants are state-independent, and a rule
    # stated only in always-loaded markdown is diluted to nothing by mid-session
    # skill loads — re-injecting per turn is the only position that survives.
    cat <<'EOF'
RESPONSE RULES (re-injected every turn; these govern the reply, not the work).
- Every question or set of options is a NUMBERED list — never an unnumbered
  a-or-b, never a bare open question.
- Lead with the direct answer or result. No preamble, no restatement of the
  request, no summary of what you are about to do.
EOF
    if [ "$(current)" = 'terse' ]; then
      cat <<'EOF'
- MODE: TERSE — Reply with the answer or current status in 1-2 sentences.
  Provide follow-up options as a short flat numbered list, with a recommendation if applicable.
  Consider providing the following options iff applicable:
  1. Detailed explanation.
EOF
    else
      cat <<'EOF'
- MODE: NORMAL — no line budget, but stay proportionate to the request; length
  is earned by content, never by restating or narrating.
EOF
    fi
    # The pin is emitted last so it reads as the narrowest constraint, and only
    # when one exists — an unpinned session must look exactly as it did before.
    pinned=$(current_focus)
    if [ -n "$pinned" ]; then
      printf -- '- FOCUS: %s\n' "$pinned"
      cat <<'EOF'
  Work ONLY on this. Do not start adjacent work, refactors, or cleanups noticed
  in passing, and do not offer them. Do not monitor or poll CI, background runs,
  or PR state unless the pinned task IS that.
  An off-task request gets one line naming the conflict plus a numbered choice
  (1. do it now  2. stay on the pin) — never silent compliance.
  Clear the pin with `/mode terse` or `/mode normal`.
EOF
    fi
    cat <<'EOF'
- These govern form only. They do NOT override correctness, required safety
  steps, showing test/command output, or reporting a failure honestly. Numbered
  options survive in every mode.
EOF
    ;;
  *)
    printf 'usage: mode.sh {get|toggle|set <mode>|focus {get|set <text>|clear}|context}\n' >&2; exit 2
    ;;
esac
