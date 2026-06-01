#!/usr/bin/env bash
#
# Copyright 2026 DXOS.org
#
# PreToolUse guard: refuse Edit/Write/MultiEdit/NotebookEdit that target the
# MAIN checkout while the session is running inside a worktree. Catches the
# failure mode where an absolute path is built from the repo root instead of
# the assigned worktree, silently landing edits on `main`.
#
# Allows: edits inside the worktree, and anything outside the repo (e.g. the
# auto-memory directory under ~/.claude). Enforces only in worktree sessions.

set -euo pipefail

input=$(cat)
project_dir="${CLAUDE_PROJECT_DIR:-}"

# Only enforce inside a worktree session (path contains /.claude/worktrees/).
case "$project_dir" in
  */.claude/worktrees/*) ;;
  *) exit 0 ;;
esac

# Derive the main checkout root (everything before /.claude/worktrees/).
main_root="${project_dir%%/.claude/worktrees/*}"

# Target path: file_path for Edit/Write/MultiEdit, notebook_path for NotebookEdit.
path=$(printf '%s' "$input" | jq -r '.tool_input.file_path // .tool_input.notebook_path // empty')
[ -z "$path" ] && exit 0

# Resolve relative paths against the worktree (the session cwd).
case "$path" in
  /*) abs="$path" ;;
  *) abs="$project_dir/$path" ;;
esac

# Canonicalize to collapse `..`/`.` segments before the string boundary checks, so a path like
# "$project_dir/../foo" can't textually match the worktree prefix and escape it. Uses purely
# lexical normalization (no filesystem/symlink resolution needed): python3 `normpath` is portable
# across macOS/Linux; `realpath -m` (GNU) is a fallback; raw value as a last resort.
canonicalize() {
  python3 -c 'import os,sys; print(os.path.normpath(sys.argv[1]))' "$1" 2>/dev/null ||
    realpath -m "$1" 2>/dev/null ||
    printf '%s' "$1"
}
abs=$(canonicalize "$abs")
project_dir=$(canonicalize "$project_dir")
main_root=$(canonicalize "$main_root")

# Allow anything inside the worktree.
case "$abs" in
  "$project_dir"/* | "$project_dir") exit 0 ;;
esac

# Deny edits that land inside the main checkout but outside the worktree.
case "$abs" in
  "$main_root"/*)
    suffix="${abs#"$main_root"/}"
    reason="Refusing to edit the MAIN checkout: '$abs'. This session's worktree is '$project_dir'. Re-issue the edit against the worktree path: '$project_dir/$suffix'."
    jq -n --arg r "$reason" \
      '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:$r}}'
    exit 0
    ;;
esac

exit 0
