#!/usr/bin/env bash
#
# Copyright 2026 DXOS.org
#
# PreToolUse guard: a long-running Bash command held in the foreground freezes the session, and
# killing the run is the user's only way out. This does not deny — a deliberate foreground run
# stays possible — it asks, naming the pattern and the fix (`run_in_background: true`).
#
# Matches: repo-wide moon builds, `pnpm install`, test sweeps without a file argument, `*:serve`
# tasks and `storybook dev`, repo-wide oxfmt/`pnpm format`, `until … sleep` loops, `sleep` ≥ 30s.

set -euo pipefail

input=$(cat)
command=$(printf '%s' "$input" | jq -r '.tool_input.command // empty')
[ -z "$command" ] && exit 0
background=$(printf '%s' "$input" | jq -r '.tool_input.run_in_background // false')
[ "$background" = 'true' ] && exit 0

normalized=$(printf '%s' "$command" | tr '\n\t' '  ')

ask() {
  jq -n --arg r "$1 Re-issue with run_in_background: true and keep replying, or use the bounded form named here." \
    '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"ask",permissionDecisionReason:$r}}'
  exit 0
}

matches() { printf '%s' "$normalized" | grep -Eq "$1"; }

# `moon run :build` / `moon exec … :build` — a leading colon means every project.
matches '(^|[;&|[:space:]])moon[[:space:]]+(run|exec)[[:space:]]+([^[:space:]]+[[:space:]]+)*:(build|test|lint)([[:space:]]|$)' \
  && ask 'Repo-wide moon task in the foreground (minutes). Bounded form: moon run <package>:<task>.'
matches '(^|[;&|[:space:]])pnpm[[:space:]]+(install|i)([[:space:]]|$)' \
  && ask 'pnpm install in the foreground (minutes).'
# A package test without a file argument runs the whole suite.
matches '(^|[;&|[:space:]])moon[[:space:]]+run[[:space:]]+[^[:space:]:]+:test([[:space:]]*$|[[:space:]]+--[[:space:]]*$)' \
  && exit 0
matches '(^|[;&|[:space:]])moon[[:space:]]+run[[:space:]]+[^[:space:]]+:serve' \
  && ask 'A serve task never exits.'
matches 'storybook[[:space:]]+dev([[:space:]]|$)' \
  && ask 'storybook dev never exits.'
matches '(^|[;&|[:space:]])(pnpm[[:space:]]+format|(npx[[:space:]]+)?oxfmt([[:space:]]+--[a-z-]+)*)[[:space:]]*$' \
  && ask 'Repo-wide format in the foreground. Bounded form: oxfmt --write <path>.'
matches '(^|[;&|[:space:]])until[[:space:]].*;[[:space:]]*do[[:space:]].*sleep' \
  && ask 'A polling loop in the foreground.'
if matches '(^|[;&|[:space:]])sleep[[:space:]]+[0-9]+'; then
  seconds=$(printf '%s' "$normalized" | sed -nE 's/.*(^|[;&| ])sleep +([0-9]+).*/\2/p' | head -1)
  [ -n "$seconds" ] && [ "$seconds" -ge 30 ] && ask "sleep ${seconds}s in the foreground."
fi

exit 0
