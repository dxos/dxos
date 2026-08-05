#!/usr/bin/env bash
#
# Copyright 2026 DXOS.org
#
# PreToolUse guard: refuse Bash commands that create, rename, or add worktrees or
# branches. The harness owns this session's branch and worktree; the agent must
# never create/rename/switch them. Enforced regardless of where the session runs
# (worktree, primary checkout, or a mis-instantiated main-root session) — the
# old gate keyed on CLAUDE_PROJECT_DIR containing /.claude/worktrees/, which left
# this guard inert exactly in the main-root sessions where it matters most.
#
# Denies:
#   git worktree add ...        -> agent-created side worktree
#   git checkout -b|-B ...       -> new branch (drifts off claude/<dir>)
#   git switch  -c|-C ...        -> new branch
#   git branch  -m|-M ...        -> branch rename
#
# Allows: file-level checkout (`git checkout -- path`, `git checkout <file>`),
# toggling to an existing branch, and everything that is not one of the above.

set -euo pipefail

input=$(cat)

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
  deny "Refusing to create a worktree: the harness owns this session's worktree. Creating another breaks the Desktop UI's session/worktree pairing. Work on the assigned branch; if you need a different branch, ask the user."
fi

# git checkout -b|-B / git switch -c|-C — creating a new branch. The suffix
# accepts any char (not just whitespace) so combined forms like `-bq`/`-cname`
# cannot bypass the guard; newlines are already normalized to spaces above.
if printf '%s' "$normalized" | grep -Eq '(^|[;&|[:space:]])git[[:space:]]+(checkout[[:space:]]+-[bB]|switch[[:space:]]+-[cC])(.|$)'; then
  deny "Refusing to create a new branch: the harness assigns this session's branch (the Desktop UI pairs it to the worktree via a claude/… convention). Do not create branches unless the user explicitly asks."
fi

# git branch -m|-M — renaming a branch (combined form `-mnewname` also caught).
if printf '%s' "$normalized" | grep -Eq '(^|[;&|[:space:]])git[[:space:]]+branch[[:space:]]+-[mM](.|$)'; then
  deny "Refusing to rename the branch: the harness assigns this session's branch and the Desktop UI pairs it to the worktree. Do not rename the branch."
fi

exit 0
