#!/usr/bin/env bash
#
# Copyright 2026 DXOS.org
#
# Feeds PreToolUse JSON to the foreground guard. Run: bash .claude/hooks/guard-foreground.test.sh

set -uo pipefail
hook="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/guard-foreground.sh"
pass=0; fail=0
check() {
  local label=$1 expected=$2 actual=$3
  if [ "$expected" = "$actual" ]; then printf 'PASS  %s\n' "$label"; pass=$((pass + 1))
  else printf 'FAIL  %s\n        expected: %s\n        actual:   %s\n' "$label" "$expected" "$actual"; fail=$((fail + 1)); fi
}
decision() {
  local out
  out=$(jq -nc --arg c "$1" --argjson bg "${2:-false}" --argjson t "${3:-0}" \
    '{tool_name:"Bash", tool_input:{command:$c, run_in_background:$bg, timeout:$t}}' | bash "$hook")
  if [ -z "$out" ]; then printf 'none'; else printf '%s' "$out" | jq -r '.hookSpecificOutput.permissionDecision // "none"'; fi
}

echo '=== asks on known long runners in the foreground'
check 'repo build' 'ask' "$(decision 'moon exec --on-failure continue --quiet :build')"
check 'moon run :build' 'ask' "$(decision 'moon run :build')"
check 'pnpm install' 'ask' "$(decision 'pnpm install')"
check 'test sweep' 'ask' "$(decision 'MOON_CONCURRENCY=4 moon run :test -- --no-file-parallelism')"
check 'serve task' 'ask' "$(decision 'moon run storybook-react:serve')"
check 'serve task via exec' 'ask' "$(decision 'moon exec storybook-react:serve')"
check 'longer sleep after shorter' 'ask' "$(decision 'sleep 40 ; sleep 5')"
check 'storybook dev' 'ask' "$(decision 'pnpm exec storybook dev --port 9009')"
check 'repo-wide format' 'ask' "$(decision 'pnpm format')"
check 'until loop' 'ask' "$(decision 'until curl -sf localhost:9009; do sleep 2; done')"
check 'foreground sleep' 'ask' "$(decision 'sleep 60')"
check 'explicit long timeout' 'ask' "$(decision 'moon run echo:build' false 600000)"

echo '=== silent when backgrounded or bounded'
check 'backgrounded build' 'none' "$(decision 'moon run :build' true)"
check 'single package build' 'none' "$(decision 'moon run echo:build')"
check 'single test file' 'none' "$(decision 'moon run echo:test -- src/foo.test.ts')"
check 'single package test' 'none' "$(decision 'moon run echo:test')"
check 'oxfmt on a path' 'none' "$(decision 'npx oxfmt --write packages/core/echo/src/foo.ts')"
check 'git status' 'none' "$(decision 'git status')"
check 'long timeout backgrounded' 'none' "$(decision 'moon run echo:build' true 600000)"
check 'short timeout' 'none' "$(decision 'git status' false 5000)"
check 'short sleep' 'none' "$(decision 'sleep 2')"
check 'two short sleeps' 'none' "$(decision 'sleep 2; sleep 3')"
check 'empty command' 'none' "$(out=$(jq -nc '{tool_name:"Bash", tool_input:{}}' | bash "$hook"); if [ -z "$out" ]; then printf 'none'; else printf '%s' "$out" | jq -r '.hookSpecificOutput.permissionDecision // "none"'; fi)"

echo '=== the reason names the fix'
reason=$(jq -nc '{tool_name:"Bash", tool_input:{command:"pnpm install"}}' | bash "$hook" | jq -r '.hookSpecificOutput.permissionDecisionReason')
check 'mentions run_in_background' '1' "$(printf '%s' "$reason" | grep -c run_in_background)"

echo '=== survives a command near/past the pipe buffer without SIGPIPE (guard-foreground.sh:22-23)'
huge_plain=$(printf 'echo %0200000d' 0)
huge_plain_out=$(jq -nc --arg c "$huge_plain" '{tool_name:"Bash", tool_input:{command:$c}}' | bash "$hook")
huge_plain_rc=$?
check 'huge command exits 0' '0' "$huge_plain_rc"
check 'huge command decision' 'none' "$(if [ -z "$huge_plain_out" ]; then printf 'none'; else printf '%s' "$huge_plain_out" | jq -r '.hookSpecificOutput.permissionDecision // "none"'; fi)"

huge_sleep=$(printf 'sleep 60 # %0200000d' 0)
huge_sleep_out=$(jq -nc --arg c "$huge_sleep" '{tool_name:"Bash", tool_input:{command:$c}}' | bash "$hook")
huge_sleep_rc=$?
check 'huge sleep command exits 0' '0' "$huge_sleep_rc"
check 'huge sleep command still asks' 'ask' "$(if [ -z "$huge_sleep_out" ]; then printf 'none'; else printf '%s' "$huge_sleep_out" | jq -r '.hookSpecificOutput.permissionDecision // "none"'; fi)"

printf '\n%s passed, %s failed\n' "$pass" "$fail"
[ "$fail" -eq 0 ]
