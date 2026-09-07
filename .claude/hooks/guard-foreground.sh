#!/usr/bin/env bash
#
# Copyright 2026 DXOS.org
#
# PreToolUse guard: a long-running Bash command held in the foreground freezes the session, and
# killing the run is the user's only way out. This does not deny — a deliberate foreground run
# stays possible — it asks, naming the pattern and the fix (`run_in_background: true`).
#
# Matches: repo-wide moon builds, `pnpm install`, test sweeps without a file argument, `*:serve`
# tasks and `storybook dev`, repo-wide oxfmt/`pnpm format`, `until … sleep` loops, `sleep` ≥ 30s,
# and any explicit `timeout` over 30000ms.

set -euo pipefail

input=$(cat)
# One jq call for all three fields, and `|| printf ''` so a machine without jq exits 0 silently
# rather than 127 under `set -e`. The command comes last because it may span lines.
parsed=$(printf '%s' "$input" \
  | jq -r '"\(.tool_input.run_in_background // false) \(.tool_input.timeout // 0)", (.tool_input.command // "")' 2>/dev/null \
  || printf '')
[ -z "$parsed" ] && exit 0
header=$(printf '%s\n' "$parsed" | head -1)
command=$(printf '%s\n' "$parsed" | tail -n +2)
background=${header%% *}
timeout=${header##* }
[ -z "$command" ] && exit 0
[ "$background" = 'true' ] && exit 0

normalized=$(printf '%s' "$command" | tr '\n\t' '  ')

ask() {
  jq -n --arg r "$1 Re-issue with run_in_background: true and keep replying, or use the bounded form named here." \
    '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"ask",permissionDecisionReason:$r}}'
  exit 0
}

matches() { printf '%s' "$normalized" | grep -Eq "$1"; }

# An explicit deadline past 30s is the caller saying the run is long, whatever it runs.
case "$timeout" in
  '' | *[!0-9]*) ;;
  *) if [ "$timeout" -gt 30000 ]; then ask "Bash timeout of $((timeout / 1000))s in the foreground."; fi ;;
esac

# `moon run :build` / `moon exec … :build` — a leading colon means every project.
matches '(^|[;&|[:space:]])moon[[:space:]]+(run|exec)[[:space:]]+([^[:space:]]+[[:space:]]+)*:(build|test|lint)([[:space:]]|$)' \
  && ask 'Repo-wide moon task in the foreground (minutes). Bounded form: moon run <package>:<task>.'
matches '(^|[;&|[:space:]])pnpm[[:space:]]+(install|i)([[:space:]]|$)' \
  && ask 'pnpm install in the foreground (minutes).'
# One package's suite is bounded; only the repo-wide sweep above is a stall.
matches '(^|[;&|[:space:]])moon[[:space:]]+run[[:space:]]+[^[:space:]:]+:test([[:space:]]*$|[[:space:]]+--[[:space:]]*$)' \
  && exit 0
matches '(^|[;&|[:space:]])moon[[:space:]]+(run|exec)[[:space:]]+[^[:space:]]+:serve' \
  && ask 'A serve task never exits.'
matches 'storybook[[:space:]]+dev([[:space:]]|$)' \
  && ask 'storybook dev never exits.'
matches '(^|[;&|[:space:]])(pnpm[[:space:]]+format|(npx[[:space:]]+)?oxfmt([[:space:]]+--[a-z-]+)*)[[:space:]]*$' \
  && ask 'Repo-wide format in the foreground. Bounded form: oxfmt --write <path>.'
matches '(^|[;&|[:space:]])until[[:space:]].*;[[:space:]]*do[[:space:]].*sleep' \
  && ask 'A polling loop in the foreground.'
if matches '(^|[;&|[:space:]])sleep[[:space:]]+[0-9]+'; then
  # Take the longest sleep in the command — a short sleep after a long one must not mask it.
  seconds=$(printf '%s' "$normalized" | grep -oE '(^|[;&| ])sleep +[0-9]+' | grep -oE '[0-9]+' | sort -rn | head -1) || true
  [ -n "$seconds" ] && [ "$seconds" -ge 30 ] && ask "sleep ${seconds}s in the foreground."
fi

exit 0
