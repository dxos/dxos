#!/usr/bin/env bash
#
# Copyright 2026 DXOS.org
#
# Backs the UserPromptSubmit hook that toggles response verbosity via
# `$concise` / `$natural` sentinels in normal messages.
#
#   mode.sh get      -> print current mode (concise|natural)
#   mode.sh toggle   -> flip the mode, print the new mode
#   mode.sh context  -> when concise, print the directive injected into each
#                       prompt; prints nothing in natural mode
#
# State is per-user runtime, not repo policy: it lives in an untracked file and
# must stay out of git (ignored via the root .gitignore).

set -euo pipefail

root="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
state="$root/.claude/.mode"

current() { cat "$state" 2>/dev/null || printf 'natural'; }

case "${1:-get}" in
  get)
    current; printf '\n'
    ;;
  toggle)
    if [ "$(current)" = 'concise' ]; then
      printf 'natural' > "$state"; printf 'Mode: NATURAL\n'
    else
      printf 'concise' > "$state"; printf 'Mode: CONCISE\n'
    fi
    ;;
  set)
    case "${2:-}" in
      concise) printf 'concise' > "$state"; printf 'Mode: CONCISE\n' ;;
      natural|default|off) printf 'natural' > "$state"; printf 'Mode: NATURAL\n' ;;
      *) printf 'usage: mode.sh set {concise|natural}\n' >&2; exit 2 ;;
    esac
    ;;
  context)
    [ "$(current)" = 'concise' ] || exit 0
    cat <<'EOF'
MODE: CONCISE is ON.
- Answer in the fewest words that fully address the request. Lead with the direct
  answer or result; drop preamble, restatement, and filler.
- Minimal markdown. Prefer one sentence or a short list over prose.
- If material detail exists beyond the terse answer, end with a single line:
  `(say "more" for detail)`.
- This governs verbosity only — it does NOT override correctness, required
  safety, numbered-option questions, or showing test/command output.
EOF
    ;;
  *)
    printf 'usage: mode.sh {get|toggle|context}\n' >&2; exit 2
    ;;
esac
