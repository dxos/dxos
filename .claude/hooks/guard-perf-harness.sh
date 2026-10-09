#!/usr/bin/env bash
#
# Copyright 2026 DXOS.org
#
# PreToolUse guard: while `pnpm perf freeze` holds the harness (`.perf/frozen` exists), refuse edits
# to the files that define a measurement, so an optimization loop cannot move its own yardstick.
# Not a security boundary (a Bash command can always find a way); `pnpm perf compare` is: it voids
# any verdict whose harness differs between the two arms.
#
# Denies: Edit/Write/MultiEdit/NotebookEdit of a frozen path, and a Bash command that names a frozen
# path together with a writing verb (sed -i, perl -i, redirection, tee, mv, cp, rm, git checkout/restore/apply).
# Allows: everything while nothing is frozen, and reads of frozen paths.

set -euo pipefail

input=$(cat)

root=$(git rev-parse --show-toplevel 2>/dev/null || true)
[ -z "$root" ] && exit 0
frozen="$root/.perf/frozen"
[ -f "$frozen" ] || exit 0

deny() {
  jq -n --arg r "$1" \
    '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:$r}}'
  exit 0
}

reason() {
  printf 'Refusing to change %s: the perf harness is frozen (%s) so measurements stay comparable. Change the app, not the measurement; a harness change is its own PR, made after `pnpm perf thaw`.' "$1" "$frozen"
}

tool=$(printf '%s' "$input" | jq -r '.tool_name // empty')

case "$tool" in
  Edit | Write | MultiEdit | NotebookEdit)
    path=$(printf '%s' "$input" | jq -r '.tool_input.file_path // .tool_input.notebook_path // empty')
    [ -z "$path" ] && exit 0
    case "$path" in
      /*) relative=${path#"$root"/} ;;
      *) relative=$path ;;
    esac
    while IFS= read -r prefix; do
      [ -z "$prefix" ] && continue
      case "$relative" in
        "$prefix" | "$prefix"/*) deny "$(reason "$relative")" ;;
      esac
    done < <(jq -r '.paths[]' "$frozen")
    ;;
  Bash)
    command=$(printf '%s' "$input" | jq -r '.tool_input.command // empty')
    # Redirects to /dev/null or between descriptors write nothing.
    printf '%s' "$command" | sed -E 's#[0-9&]*>[[:space:]]*/dev/null##g; s#[0-9]*>&[0-9]##g' |
      grep -Eq '(sed|perl)[[:space:]]+-[a-zA-Z]*i|>|(^|[;&|[:space:]])(tee|mv|cp|rm|truncate|patch)[[:space:]]|git[[:space:]]+(checkout|restore|apply)' ||
      exit 0
    while IFS= read -r prefix; do
      [ -z "$prefix" ] && continue
      case "$command" in
        *"$prefix"*) deny "$(reason "$prefix")" ;;
      esac
    done < <(jq -r '.paths[]' "$frozen")
    ;;
esac

exit 0
