#!/usr/bin/env bash
#
# Copyright 2026 DXOS.org
#
# Backs the UserPromptSubmit hook that toggles response verbosity via
# "$mode <terse | normal>". `concise` aliases terse; `natural`/`default`/`off`
# alias normal.
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

# Transitional: the state file was renamed alongside the script, so adopt an
# existing value once and drop the old file — otherwise checkouts that predate
# the rename silently reset to normal and leave the stale file untracked. The
# legacy file is unlinked only once its value is safely in the new one; a failed
# move must not destroy the mode it was carrying.
if [ -e "$legacy" ]; then
  if [ -e "$state" ]; then
    rm -f "$legacy" 2>/dev/null || true
  elif ! mv "$legacy" "$state" 2>/dev/null; then
    printf 'WARNING: could not migrate %s to %s; leaving it in place.\n' "$legacy" "$state" >&2
  fi
fi

# Canonicalise on read so a stale or hand-edited state file cannot wedge the
# machine in an unrecognised mode — anything that is not terse means normal.
current() {
  case "$(cat "$state" 2>/dev/null)" in
    terse | concise) printf 'terse' ;;
    *) printf 'normal' ;;
  esac
}

case "${1:-get}" in
  get)
    current; printf '\n'
    ;;
  toggle)
    if [ "$(current)" = 'terse' ]; then
      printf 'normal' > "$state"; printf 'Mode: NORMAL\n'
    else
      printf 'terse' > "$state"; printf 'Mode: TERSE\n'
    fi
    ;;
  set)
    case "${2:-}" in
      terse|concise) printf 'terse' > "$state"; printf 'Mode: TERSE\n' ;;
      normal|natural|default|off) printf 'normal' > "$state"; printf 'Mode: NORMAL\n' ;;
      *) printf 'usage: mode.sh set {terse|normal}\n' >&2; exit 2 ;;
    esac
    ;;
  context)
    # Emitted in BOTH modes. The invariants are state-independent, and a rule
    # stated only in always-loaded markdown is diluted to nothing by mid-session
    # skill loads — re-injecting per turn is the only position that survives.
    cat <<'EOF'
RESPONSE RULES (re-injected every turn; these govern the reply, not the work).
- Open with one line naming the worktree directory you are in and the
  instruction/skill files you actually read this turn. State it every time, not
  just in the first reply of a session.
- Every question or set of options is a NUMBERED list — never an unnumbered
  a-or-b, never a bare open question.
- Lead with the direct answer or result. No preamble, no restatement of the
  request, no summary of what you are about to do.
EOF
    if [ "$(current)" = 'terse' ]; then
      cat <<'EOF'
- MODE: TERSE — at most 8 lines total. No headings, no nested bullets, minimal
  markdown. Prefer one sentence or a short flat list. If material detail
  remains, end with exactly: `(say "more" for detail)`.
EOF
    else
      cat <<'EOF'
- MODE: NORMAL — no line budget, but stay proportionate to the request; length
  is earned by content, never by restating or narrating.
EOF
    fi
    cat <<'EOF'
- These govern form only. They do NOT override correctness, required safety
  steps, showing test/command output, or reporting a failure honestly. The
  worktree line and numbered options survive in every mode.
EOF
    ;;
  *)
    printf 'usage: mode.sh {get|toggle|context}\n' >&2; exit 2
    ;;
esac
