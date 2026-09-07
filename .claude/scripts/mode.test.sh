#!/usr/bin/env bash
#
# Copyright 2026 DXOS.org
#
# Tests for the response-mode hook and its state backend, by feeding the hook
# the same JSON the `UserPromptSubmit` event does. Run it by hand:
#
#   bash .claude/scripts/mode.test.sh
#
# The real scripts are exercised through symlinks inside a throwaway
# `CLAUDE_PROJECT_DIR`, so a run can never touch the state of the session
# running it — the mode is per-worktree, and clobbering it mid-session would be
# an invisible failure.

set -uo pipefail

repo=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
sandbox=$(mktemp -d)
trap 'rm -rf "$sandbox"' EXIT

mkdir -p "$sandbox/.claude"
ln -s "$repo/.claude/hooks" "$sandbox/.claude/hooks"
ln -s "$repo/.claude/scripts" "$sandbox/.claude/scripts"

export CLAUDE_PROJECT_DIR="$sandbox"
hook="$repo/.claude/hooks/mode.sh"
script="$repo/.claude/scripts/mode.sh"
state="$sandbox/.claude/.mode"
focus="$sandbox/.claude/.focus"
phase="$sandbox/.claude/.phase"
debug="$sandbox/.claude/.debug"

pass=0
fail=0

check() {
  local label=$1 expected=$2 actual=$3
  if [ "$expected" = "$actual" ]; then
    printf 'PASS  %s\n' "$label"
    pass=$((pass + 1))
  else
    printf 'FAIL  %s\n        expected: %s\n        actual:   %s\n' "$label" "$expected" "$actual"
    fail=$((fail + 1))
  fi
}

run() { printf '%s' "$1" | bash "$hook"; }
payload() { jq -nc --arg p "$1" --arg t "${2:-}" '{prompt: $p, transcript_path: $t}'; }
reset() { rm -f "$state" "$focus" "$phase" "$debug"; }
pin_state() { [ -e "$focus" ] && printf 'present' || printf 'absent'; }

transcript="$sandbox/transcript.jsonl"
cat > "$transcript" <<'JSONL'
{"type":"user","message":{"role":"user","content":"land the PR and fix the lint job"}}
{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"ok"}]}}
{"type":"user","message":{"role":"user","content":[{"type":"tool_result","content":"stdout"}]}}
JSONL

unpinnable="$sandbox/unpinnable.jsonl"
cat > "$unpinnable" <<'JSONL'
{"type":"user","message":{"role":"user","content":"/mode normal"}}
{"type":"user","isMeta":true,"message":{"role":"user","content":"meta noise"}}
JSONL

echo '=== 1. /mode focus <task> sets terse and pins the task'
reset
out=$(run "$(payload '/mode focus land the PR')")
check '1a mode is terse' 'terse' "$(cat "$state")"
check '1b task pinned' 'land the PR' "$(cat "$focus")"
check '1c context carries the pin' '1' "$(printf '%s' "$out" | grep -c '^- FOCUS: land the PR$')"
check '1d context is terse' '1' "$(printf '%s' "$out" | grep -c 'MODE: TERSE')"
check '1e context bans CI polling' '1' "$(printf '%s' "$out" | grep -c 'Do not monitor or poll CI')"

echo '=== 2. bare /mode focus pins the previous instruction'
reset
out=$(run "$(payload '/mode focus' "$transcript")")
check '2a mode is terse' 'terse' "$(cat "$state")"
check '2b previous instruction pinned' 'land the PR and fix the lint job' "$(cat "$focus")"
check '2c hook asks for a restatement' '1' "$(printf '%s' "$out" | grep -c 'Restate the pinned task')"

echo '=== 3. bare /mode focus with nothing pinnable leaves the session unpinned'
reset
out=$(run "$(payload '/mode focus' "$unpinnable")")
check '3a mode is terse' 'terse' "$(cat "$state")"
check '3b no pin written' 'absent' "$(pin_state)"
check '3c hook says so' '1' "$(printf '%s' "$out" | grep -c 'UNPINNED')"

echo '=== 4. bare /mode focus survives a missing transcript'
reset
out=$(run "$(payload '/mode focus' "$sandbox/absent.jsonl")")
check '4a mode is terse' 'terse' "$(cat "$state")"
check '4b no pin written' 'absent' "$(pin_state)"

echo '=== 5. naming a verbosity clears the pin'
for mode in terse normal concise off; do
  reset
  run "$(payload '/mode focus something')" > /dev/null
  out=$(run "$(payload "/mode $mode")")
  check "5-$mode clears the pin" 'absent' "$(pin_state)"
  check "5-$mode context drops FOCUS" '0' "$(printf '%s' "$out" | grep -c '^- FOCUS:')"
done

echo '=== 6. near-miss forms are inert'
inert=(
  'we should add /mode focus to the hook'
  '/mode focusx do a thing'
  '/modefocus thing'
  'x
/mode focus on the second line'
)
for prompt in "${inert[@]}"; do
  reset
  printf 'normal' > "$state"
  run "$(payload "$prompt")" > /dev/null
  check "6 inert: ${prompt%%$'\n'*}" 'normal|absent' "$(cat "$state")|$(pin_state)"
done

echo '=== 7. the pin survives ordinary turns'
reset
run "$(payload '/mode focus land the PR')" > /dev/null
out=$(run "$(payload 'what is the status?')")
check '7a still pinned' 'land the PR' "$(cat "$focus")"
check '7b context still carries it' '1' "$(printf '%s' "$out" | grep -c '^- FOCUS: land the PR$')"

echo '=== 8. an unreadable pin degrades to unpinned instead of wedging'
reset
printf 'terse' > "$state"
# A directory, not `chmod 000`: root ignores the mode bits, so on a privileged
# runner the pin would still be readable and this case would silently not run.
mkdir "$focus"
out=$(run "$(payload 'status?')" 2> /dev/null)
check '8a no FOCUS emitted' '0' "$(printf '%s' "$out" | grep -c '^- FOCUS:')"
check '8b rules still emitted' '1' "$(printf '%s' "$out" | grep -c 'RESPONSE RULES')"
rmdir "$focus"

echo '=== 9. an over-long pin is truncated'
reset
long=$(printf 'x%.0s' $(seq 1 2500))
run "$(payload "/mode focus $long")" > /dev/null
check '9a truncated' '1' "$(grep -c '… (truncated)$' "$focus")"
check '9b shorter than the input' 'shorter' "$([ "$(wc -c < "$focus")" -lt 2500 ] && echo shorter || echo longer)"

echo '=== 10. the focus subcommand round-trips by hand'
reset
bash "$script" focus set 'hand-run' > /dev/null
check '10a get' 'hand-run' "$(bash "$script" focus get)"
bash "$script" focus clear > /dev/null
check '10b cleared' '' "$(bash "$script" focus get)"
check '10c empty set is a usage error' '2' "$(
  bash "$script" focus set > /dev/null 2>&1
  echo $?
)"
check '10d clearing an absent pin succeeds' '0' "$(
  bash "$script" focus clear > /dev/null 2>&1
  echo $?
)"
check '10e get on an unpinned session succeeds' '0' "$(
  bash "$script" focus get > /dev/null 2>&1
  echo $?
)"

echo '=== 11. the phase subcommand round-trips by hand'
reset
check '11a default phase is discuss' 'discuss' "$(bash "$script" phase get)"
bash "$script" phase set build > /dev/null
check '11b set build' 'build' "$(bash "$script" phase get)"
check '11c build leaves debug off' 'off' "$(bash "$script" debug get)"
bash "$script" phase set debug > /dev/null
check '11d set debug' 'debug' "$(bash "$script" phase get)"
check '11e debug turns the flag on' 'on' "$(bash "$script" debug get)"
bash "$script" phase set discuss > /dev/null
check '11f discuss clears the flag' 'off' "$(bash "$script" debug get)"
check '11g bad phase is a usage error' '2' "$(
  bash "$script" phase set plan > /dev/null 2>&1
  echo $?
)"
printf 'garbage' > "$phase"
check '11h garbage canonicalises to discuss' 'discuss' "$(bash "$script" phase get)"
bash "$script" set terse > /dev/null
check '11i verbosity does not touch the phase' 'garbage' "$(cat "$phase")"

echo '=== 12. /mode <phase> sets the phase and nothing else'
reset
printf 'terse' > "$state"
printf 'keep me' > "$focus"
out=$(run "$(payload '/mode build')")
check '12a phase written' 'build' "$(cat "$phase")"
check '12b verbosity untouched' 'terse' "$(cat "$state")"
check '12c pin untouched' 'keep me' "$(cat "$focus")"
check '12d hook acknowledges' '1' "$(printf '%s' "$out" | grep -c 'Phase already set')"
run "$(payload '/mode debug')" > /dev/null
check '12e debug flag on' 'present' "$([ -e "$debug" ] && echo present || echo absent)"
run "$(payload '/mode discuss')" > /dev/null
check '12f discuss clears the flag' 'absent' "$([ -e "$debug" ] && echo present || echo absent)"
run "$(payload '/mode debugging')" > /dev/null
check '12g prefix does not match' 'discuss' "$(cat "$phase")"
run "$(payload 'we should /mode build later')" > /dev/null
check '12h mid-sentence is inert' 'discuss' "$(cat "$phase")"

echo '=== 13. /mode focus implies build'
reset
run "$(payload '/mode debug')" > /dev/null
run "$(payload '/mode focus ship it')" > /dev/null
check '13a phase is build' 'build' "$(cat "$phase")"
check '13b debug flag cleared' 'absent' "$([ -e "$debug" ] && echo present || echo absent)"
check '13c pin set' 'ship it' "$(cat "$focus")"
check '13d mode is terse' 'terse' "$(cat "$state")"

echo '=== 14. context carries the phase clause and the diagnostics footer'
reset
out=$(run "$(payload 'hi')")
check '14a default phase clause' '1' "$(printf '%s' "$out" | grep -c '^- PHASE: DISCUSS')"
check '14b discuss rule present' '1' "$(printf '%s' "$out" | grep -c 'background subagent')"
check '14c no diagnostics by default' '0' "$(printf '%s' "$out" | grep -c '^DIAGNOSTICS:')"
check '14d phase after mode, before form clause' 'ordered' "$(
  printf '%s' "$out" | awk '/MODE: /{m=NR} /^- PHASE:/{p=NR} /govern form only/{f=NR} END{ if (m<p && p<f) print "ordered"; else print "misordered" }'
)"
run "$(payload '/mode build')" > /dev/null
out=$(run "$(payload 'hi')")
check '14e build clause' '1' "$(printf '%s' "$out" | grep -c '^- PHASE: BUILD')"
check '14f build rule present' '1' "$(printf '%s' "$out" | grep -c 'to completion')"
run "$(payload '/mode debug')" > /dev/null
out=$(run "$(payload 'hi')")
check '14g debug clause' '1' "$(printf '%s' "$out" | grep -c '^- PHASE: DEBUG')"
check '14h debug rule present' '1' "$(printf '%s' "$out" | grep -c 'one hypothesis at a time')"
check '14i diagnostics footer present' '1' "$(printf '%s' "$out" | grep -c '^DIAGNOSTICS:')"
check '14j diagnostics names the phase file' '1' "$(printf '%s' "$out" | grep -c "phase: .*\.claude/\.phase = debug")"
run "$(payload '/mode focus x')" > /dev/null
out=$(run "$(payload 'hi')")
check '14k focus renders build then pin' 'ordered' "$(
  printf '%s' "$out" | awk '/^- PHASE: BUILD/{p=NR} /^- FOCUS: x$/{f=NR} END{ if (p && f && p<f) print "ordered"; else print "misordered" }'
)"

printf '\n%s passed, %s failed\n' "$pass" "$fail"
[ "$fail" -eq 0 ]
