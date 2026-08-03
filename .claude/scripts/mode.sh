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
#   mode.sh context  -> when terse, print the directive injected into each
#                       prompt; prints nothing in normal mode
#
# State is per-user runtime, not repo policy: it lives in an untracked file and
# must stay out of git (ignored via the root .gitignore).

set -euo pipefail

root="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
state="$root/.claude/.mode"
legacy="$root/.claude/.response-mode"

# Transitional: the state file was renamed alongside the script, so adopt an
# existing value once and drop the old file — otherwise checkouts that predate
# the rename silently reset to normal and leave the stale file untracked.
if [ -e "$legacy" ]; then
  if [ ! -e "$state" ]; then
    mv "$legacy" "$state" 2>/dev/null || true
  fi
  rm -f "$legacy"
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
    # TODO(burdon): Emit in BOTH modes — the invariants (numbered options,
    # worktree reporting) are state-independent and are lost while this returns
    # early. See .agents/projects/agent-directives/TASKS.md Phase 2.
    [ "$(current)" = 'terse' ] || exit 0
    cat <<'EOF'
MODE: TERSE is ON.
- Answer in the fewest words that fully address the request.
  Lead with the direct answer or result; drop preamble, restatement, and filler.
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
