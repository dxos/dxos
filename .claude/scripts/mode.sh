#!/usr/bin/env bash
#
# Copyright 2026 DXOS.org
#
# State backend for the response-verbosity mode. `concise` aliases terse;
# `natural`/`default`/`off` alias normal.
#
# Two callers, which is why this is separate from ../hooks/mode.sh (the
# UserPromptSubmit adapter that parses stdin JSON): `.claude/commands/mode.md`
# runs `get` to report, and the adapter runs `set`/`context`. It is also
# hand-runnable — `bash .claude/scripts/mode.sh get|context` — for checking what
# a turn will actually be told, without going through a hook.
#
#   mode.sh get      -> print current mode (terse|normal)
#   mode.sh toggle   -> flip the mode, print the new mode
#   mode.sh context  -> print the response rules injected into each prompt; the
#                       invariants are emitted in BOTH modes, only the length
#                       clause varies. Never silent — a mode that says nothing
#                       in its default state is the bug this replaced.
#
# State is per-user runtime, not repo policy: it lives in an untracked file and
# must stay out of git (ignored via the root .gitignore).

set -euo pipefail

root="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
state="$root/.claude/.mode"
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
write_state() {
  local tmp
  tmp=$(mktemp "$root/.claude/.mode.XXXXXX" 2>/dev/null) || return 1
  if printf '%s' "$1" > "$tmp" 2>/dev/null && mv -f "$tmp" "$state" 2>/dev/null; then
    return 0
  fi
  rm -f "$tmp" 2>/dev/null || true
  return 1
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
    printf 'Mode: %s\n' "$(printf '%s' "$next" | tr '[:lower:]' '[:upper:]')"
    ;;
  set)
    case "${2:-}" in
      terse | concise) next='terse' ;;
      normal | natural | default | off) next='normal' ;;
      *) printf 'usage: mode.sh set {terse|normal}\n' >&2; exit 2 ;;
    esac
    write_state "$next" || { printf 'ERROR: could not write %s\n' "$state" >&2; exit 1; }
    printf 'Mode: %s\n' "$(printf '%s' "$next" | tr '[:lower:]' '[:upper:]')"
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
  - Detailed explanation.
EOF
    else
      cat <<'EOF'
- MODE: NORMAL — no line budget, but stay proportionate to the request; length
  is earned by content, never by restating or narrating.
EOF
    fi
    cat <<'EOF'
- These govern form only. They do NOT override correctness, required safety
  steps, showing test/command output, or reporting a failure honestly. Numbered
  options survive in every mode.
EOF
    ;;
  *)
    printf 'usage: mode.sh {get|toggle|context}\n' >&2; exit 2
    ;;
esac
