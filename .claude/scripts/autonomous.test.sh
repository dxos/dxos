#!/usr/bin/env bash
#
# Copyright 2026 DXOS.org
#
# Tests for the autonomous-mode hooks and their state backend, by feeding each
# hook the same JSON its event carries. Run it by hand:
#
#   bash .claude/scripts/autonomous.test.sh
#
# The real scripts run against a throwaway `CLAUDE_PROJECT_DIR`, so a run can
# never touch the state of the session running it — clobbering a live run's
# pinned task or logs would be an invisible failure.

set -uo pipefail

repo=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
sandbox=$(mktemp -d)
trap 'rm -rf "$sandbox"' EXIT

mkdir -p "$sandbox/.claude"
ln -s "$repo/.claude/hooks" "$sandbox/.claude/hooks"
ln -s "$repo/.claude/scripts" "$sandbox/.claude/scripts"

export CLAUDE_PROJECT_DIR="$sandbox"
hook="$repo/.claude/hooks/autonomous.sh"
stop_hook="$repo/.claude/hooks/autonomous-stop.sh"
script="$repo/.claude/scripts/autonomous.sh"
task_file="$sandbox/.claude/.autonomous"
user_log="$sandbox/.claude/.autonomous-user.md"
decision_log="$sandbox/.claude/.autonomous-log.md"

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

contains() {
  local label=$1 needle=$2 haystack=$3
  case "$haystack" in
    *"$needle"*)
      printf 'PASS  %s\n' "$label"
      pass=$((pass + 1))
      ;;
    *)
      printf 'FAIL  %s\n        expected to contain: %s\n        actual:   %s\n' "$label" "$needle" "$haystack"
      fail=$((fail + 1))
      ;;
  esac
}

run() { printf '%s' "$1" | bash "$hook" 2>/dev/null; }
stop_run() { printf '%s' "$1" | bash "$stop_hook" 2>/dev/null; }
payload() { jq -nc --arg p "$1" --arg t "${2:-}" '{prompt: $p, transcript_path: $t}'; }
stop_payload() { jq -nc --argjson a "${1:-false}" '{stop_hook_active: $a}'; }
reset() { rm -f "$sandbox"/.claude/.autonomous*; }
state() { [ -e "$task_file" ] && printf 'active' || printf 'inactive'; }

transcript="$sandbox/transcript.jsonl"
cat > "$transcript" <<'JSONL'
{"type":"user","message":{"role":"user","content":"keep the PR small, one package only"}}
{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"ok"}]}}
{"type":"user","message":{"role":"user","content":"fix the flaky echo test"}}
{"type":"user","message":{"role":"user","content":[{"type":"tool_result","content":"stdout"}]}}
JSONL

# --- inert unless started -----------------------------------------------------

reset
out=$(run "$(payload 'just a normal message')")
check 'no run: no AUTONOMOUS block injected' '' "$out"
check 'no run: state stays inactive' 'inactive' "$(state)"
contains 'no run: user message still logged' 'just a normal message' "$(cat "$user_log" 2>/dev/null)"

reset
out=$(run "$(payload 'we could use /autonomous here one day')")
check 'mention in prose does not start a run' 'inactive' "$(state)"
out=$(run "$(payload '/autonomousx foo')")
check 'prefix match does not start a run' 'inactive' "$(state)"
out=$(run "$(payload 'read src/autonomous off.ts')")
check 'path mention does not start a run' 'inactive' "$(state)"

# --- starting -----------------------------------------------------------------

reset
out=$(run "$(payload '/autonomous land the release PR' "$transcript")")
check 'explicit task: run is active' 'active' "$(state)"
check 'explicit task: task stored verbatim' 'land the release PR' "$(bash "$script" get)"
contains 'explicit task: hook announces ON' 'AUTONOMOUS MODE is now ON' "$out"
contains 'explicit task: block injected' '- TASK: land the release PR' "$out"
contains 'explicit task: DoD demanded first' 'DEFINITION OF DONE: NOT YET WRITTEN' "$out"
contains 'explicit task: no-questions rule injected' 'DO NOT ASK THE USER ANYTHING' "$out"
contains 'explicit task: user log seeded from transcript' 'keep the PR small, one package only' "$(cat "$user_log")"
contains 'explicit task: start recorded in decision log' 'Run started' "$(cat "$decision_log")"

reset
run "$(payload 'earlier aside about scope' "$transcript")" >/dev/null
run "$(payload '/autonomous land it' "$transcript")" >/dev/null
check 'mid-session start does not re-backfill the user log' '1' \
  "$(grep -c 'earlier aside about scope' "$user_log")"
check 'mid-session start skips the transcript backfill' '0' \
  "$(grep -c 'keep the PR small' "$user_log")"

reset
out=$(run "$(payload '/autonomous' "$transcript")")
check 'bare verb: adopts previous instruction' 'fix the flaky echo test' "$(bash "$script" get)"
contains 'bare verb: says the task was derived' 'adopted from your previous instruction' "$out"

reset
empty="$sandbox/empty.jsonl"
printf '{"type":"user","message":{"role":"user","content":"/mode terse"}}\n' > "$empty"
out=$(run "$(payload '/autonomous' "$empty")")
check 'nothing pinnable: no run started' 'inactive' "$(state)"
contains 'nothing pinnable: said out loud' 'NOTHING was started' "$out"

# --- definition of done -------------------------------------------------------

reset
run "$(payload '/autonomous fix the lint job')" >/dev/null
bash "$script" dod set '1. lint green 2. formatted' >/dev/null
out=$(run "$(payload 'carry on')")
contains 'stored DoD is injected' 'DEFINITION OF DONE: 1. lint green 2. formatted' "$out"
contains 'stored DoD replaces the demand' 'DO NOT ASK' "$out"
check 'DoD is readable back' '1. lint green 2. formatted' "$(bash "$script" dod get)"

# --- logs ---------------------------------------------------------------------

reset
run "$(payload '/autonomous ship it')" >/dev/null
bash "$script" log add 'chose vitest over jest — repo standard' >/dev/null
contains 'decision log records the entry' 'chose vitest over jest' "$(bash "$script" log show)"
run "$(payload 'and keep it to one package')" >/dev/null
contains 'user log is verbatim and append-only' 'and keep it to one package' "$(cat "$user_log")"
check 'user log kept separate from decisions' '' "$(grep -c 'chose vitest' "$user_log" | sed 's/^0$//')"

# --- stop hook ----------------------------------------------------------------

reset
out=$(stop_run "$(stop_payload false)")
check 'stop hook inert when no run is active' '' "$out"

run "$(payload '/autonomous fix the flaky test')" >/dev/null
out=$(stop_run "$(stop_payload false)")
check 'stop is blocked while a run is active' 'block' "$(printf '%s' "$out" | jq -r '.decision')"
reason=$(printf '%s' "$out" | jq -r '.reason')
contains 'block quotes the task' 'fix the flaky test' "$reason"
contains 'block forbids asking a way out' 'Do NOT ask the user a question' "$reason"
contains 'block points at the user log' 'autonomous.sh user show' "$reason"
contains 'block requires the adversarial review' 'adversarial review' "$reason"
contains 'block names the clean exit' 'autonomous.sh stop' "$reason"
contains 'block reports missing DoD' 'never wrote a definition of done' "$reason"

bash "$script" dod set 'tests pass' >/dev/null
out=$(stop_run "$(stop_payload false)")
contains 'block quotes a stored DoD' 'tests pass' "$(printf '%s' "$out" | jq -r '.reason')"

out=$(stop_run "$(stop_payload true)")
contains 'continuation block is trimmed' 'You stopped again' "$(printf '%s' "$out" | jq -r '.reason')"

# Budget: reminders were bumped by each block above; the cap is 3 per user turn.
out=$(stop_run "$(stop_payload false)")
check 'budget spent: stop is allowed' 'null' "$(printf '%s' "$out" | jq -r '.decision // "null"')"
contains 'budget spent: the USER is told' 'AUTONOMOUS MODE is still ON' "$(printf '%s' "$out" | jq -r '.systemMessage')"
check 'budget spent: run is still active' 'active' "$(state)"

out=$(run "$(payload 'keep going')")
out=$(stop_run "$(stop_payload false)")
check 'a user turn resets the budget' 'block' "$(printf '%s' "$out" | jq -r '.decision')"

# --- stopping -----------------------------------------------------------------

reset
run "$(payload '/autonomous ship the fix')" >/dev/null
check 'stop without a reason is refused' '2' "$(bash "$script" stop >/dev/null 2>&1; printf '%s' $?)"
check 'refused stop leaves the run active' 'active' "$(state)"
bash "$script" stop 'done: tests pass on CI' >/dev/null
check 'explicit stop clears the run' 'inactive' "$(state)"
contains 'explicit stop is logged with its reason' 'STOP' "$(cat "$decision_log")"
check 'cleared run silences the stop hook' '' "$(stop_run "$(stop_payload false)")"
out=$(run "$(payload 'anything')")
check 'cleared run injects nothing' '' "$out"

reset
run "$(payload '/autonomous ship the fix')" >/dev/null
out=$(run "$(payload '/autonomous off changed my mind')")
check 'user off switch clears the run' 'inactive' "$(state)"
contains 'user off switch is announced' 'now OFF' "$out"
contains 'user off switch logs the reason' 'changed my mind' "$(cat "$decision_log")"

reset
run "$(payload '/autonomous ship the fix')" >/dev/null
out=$(run "$(payload '/autonomous status')")
contains 'status asks for a report' 'Autonomous status was requested' "$out"
check 'status does not end the run' 'active' "$(state)"

# --- restarting ---------------------------------------------------------------

bash "$script" dod set 'old checklist' >/dev/null
run "$(payload '/autonomous a different task')" >/dev/null
check 'restart replaces the task' 'a different task' "$(bash "$script" get)"
check 'restart drops the stale DoD' '' "$(bash "$script" dod get)"
contains 'restart keeps the log history' 'old checklist' "$(cat "$decision_log")"

printf '\n%s passed, %s failed\n' "$pass" "$fail"
[ "$fail" -eq 0 ]
