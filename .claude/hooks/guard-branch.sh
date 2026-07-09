#!/usr/bin/env bash
#
# Copyright 2026 DXOS.org
#
# PreToolUse guard: refuse Bash commands that create, rename, or add worktrees
# or branches while the session is running inside a worktree. The Desktop UI
# pairs a session to its worktree by the convention `branch == claude/<worktree
# -dir-name>`; creating a side worktree or rebranching breaks that pairing and
# makes the session invisible in the UI.
#
# Denies (in a worktree session only):
#   git worktree add ...        -> agent-created side worktree
#   git checkout -b|-B ...       -> new branch (drifts off claude/<dir>)
#   git switch  -c|-C ...        -> new branch
#   git branch  -m|-M ...        -> branch rename
#
# Allows: file-level checkout (`git checkout -- path`, `git checkout <file>`),
# toggling to an existing branch, and everything outside a worktree session.

set -euo pipefail

input=$(cat)
project_dir="${CLAUDE_PROJECT_DIR:-}"

# Only enforce inside a worktree session (path contains /.claude/worktrees/).
case "$project_dir" in
  */.claude/worktrees/*) ;;
  *) exit 0 ;;
esac

command=$(printf '%s' "$input" | jq -r '.tool_input.command // empty')
[ -z "$command" ] && exit 0

# Normalize whitespace so multi-space / newline forms still match.
normalized=$(printf '%s' "$command" | tr '\n\t' '  ')

deny() {
  reason="$1"
  jq -n --arg r "$reason" \
    '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:$r}}'
  exit 0
}

# git worktree add — creating a side worktree.
if printf '%s' "$normalized" | grep -Eq '(^|[;&|[:space:]])git[[:space:]]+worktree[[:space:]]+add([[:space:]]|$)'; then
  deny "Refusing to create a worktree: this session already runs in the assigned worktree '$project_dir'. Creating another breaks the Desktop UI's session/worktree pairing. Work in the assigned directory; if you need a different branch, ask the user."
fi

# git checkout -b|-B / git switch -c|-C — creating a new branch.
if printf '%s' "$normalized" | grep -Eq '(^|[;&|[:space:]])git[[:space:]]+(checkout[[:space:]]+-[bB]|switch[[:space:]]+-[cC])([[:space:]]|$)'; then
  deny "Refusing to create a new branch: the assigned branch must stay 'claude/<worktree-dir-name>' so the Desktop UI can pair this session to its worktree. Do not create branches unless the user explicitly asks."
fi

# git branch -m|-M — renaming a branch.
if printf '%s' "$normalized" | grep -Eq '(^|[;&|[:space:]])git[[:space:]]+branch[[:space:]]+-[mM]([[:space:]]|$)'; then
  deny "Refusing to rename the branch: the assigned branch must stay 'claude/<worktree-dir-name>' so the Desktop UI can pair this session to its worktree. Do not rename the branch."
fi

exit 0
