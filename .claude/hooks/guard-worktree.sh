#!/usr/bin/env bash
#
# Copyright 2026 DXOS.org
#
# PreToolUse guard for Edit/Write/MultiEdit/NotebookEdit. The hazard is editing
# while HEAD is on `main` — that pollutes the shared branch irreversibly. The
# decisive signal is the BRANCH, not the directory: the harness sometimes checks
# the assigned `claude/…` branch out at the primary checkout and leaves the
# worktree path an empty stub. Editing there is safe because HEAD is the assigned
# branch, so the old path-based "primary checkout == main" rule produced false
# halts. This guard instead asks git for the branch of the target's working tree.
#
# Denies: an edit whose target lives in a working tree whose HEAD is `main`.
# Allows: edits on any feature branch (including the mis-instantiated case where
# the feature branch sits at the primary checkout), detached HEAD, and anything
# outside a git repo (e.g. the auto-memory dir under ~/.claude). Needs no
# CLAUDE_PROJECT_DIR — the old dependency on it was the hole that once let a full
# feature land on `main`.

set -euo pipefail

input=$(cat)

# Target path: file_path for Edit/Write/MultiEdit, notebook_path for NotebookEdit.
path=$(printf '%s' "$input" | jq -r '.tool_input.file_path // .tool_input.notebook_path // empty')
[ -z "$path" ] && exit 0

# Resolve a directory to query git from — the file may not exist yet (Write), so
# walk up to the nearest existing ancestor.
case "$path" in
  /*) probe=$(dirname "$path") ;;
  *)  probe="$(pwd)" ;;
esac
while [ ! -d "$probe" ] && [ "$probe" != "/" ]; do
  probe=$(dirname "$probe")
done

branch=$(git -C "$probe" rev-parse --abbrev-ref HEAD 2>/dev/null || true)
[ "$branch" = "main" ] || exit 0

# On `main`: fence edits that land inside this repo's working tree. Edits outside
# the repo (e.g. ~/.claude memory) are allowed even though HEAD reads `main`.
repo_root=$(git -C "$probe" rev-parse --show-toplevel 2>/dev/null || true)
[ -z "$repo_root" ] && exit 0

case "$path" in
  /*) abs="$path" ;;
  *)  abs="$(pwd)/$path" ;;
esac

# Lexically collapse `..`/`.` before the boundary check so a path cannot escape
# the repo prefix textually. python3 normpath is portable; realpath -m is a GNU
# fallback; raw value as last resort.
abs=$(python3 -c 'import os,sys; print(os.path.normpath(sys.argv[1]))' "$abs" 2>/dev/null ||
  realpath -m "$abs" 2>/dev/null ||
  printf '%s' "$abs")

case "$abs" in
  "$repo_root"/* | "$repo_root")
    reason="Refusing to edit '$abs': HEAD is on 'main', so this edit would pollute the shared main branch. This session's work belongs on its assigned 'claude/…' branch. If you are on main because the worktree was mis-instantiated, STOP and ask the user — do not create a worktree or branch to escape."
    jq -n --arg r "$reason" \
      '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:$r}}'
    exit 0
    ;;
esac

exit 0
