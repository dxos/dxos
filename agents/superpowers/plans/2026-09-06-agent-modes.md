# Agent Modes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give `/mode` a phase axis (`discuss|build|debug`), feed the agent a per-turn SERVERS table from one machine-wide watcher, and add a per-turn checklist plus a foreground-command guard.

**Architecture:** All state stays in per-worktree files under `.claude/` written only by `scripts/mode.sh`; the `UserPromptSubmit` hook parses the raw `/mode …` line and `mode.sh context` renders every per-turn block. Server health comes from `tools/storybook-react/diagnose.sh`, refactored into a round-robin singleton that rewrites one status file per cycle; `context` reads that file, never probes. A new `PreToolUse` hook surfaces long foreground commands as an `ask`.

**Tech Stack:** bash 3.2-compatible shell (macOS default), `jq`, `lsof`, `curl`, `ps`. Tests are the repo's existing bash assertion style (`check label expected actual`).

**Spec:** `agents/superpowers/specs/2026-09-05-agent-modes-design.md`

## Global Constraints

- bash 3.2 compatible: no associative arrays, no `${var,,}`, no `mapfile`.
- The agent never writes `.claude/.mode`, `.claude/.phase`, `.claude/.focus`, or `.claude/.debug`; only `mode.sh` does, via `write_file` (temp + rename).
- Every read canonicalises: unknown phase → `discuss`; unknown mode → `normal`.
- Default phase when `.claude/.phase` is absent: `discuss`.
- `/mode focus` sets terse + pin + `build` phase and clears the debug flag.
- `/mode build` and `/mode discuss` clear the debug flag; `/mode debug` sets it.
- Foreground guard returns `permissionDecision: "ask"`, never `"deny"`, in every phase.
- Watcher state lives in `${DX_WATCH_DIR:-$HOME/.cache/dxos/watch}`; captures stay in `<server worktree>/temp/`.
- Known ports = `9009`, `5199`, plus every `port` in the repo's `.claude/launch.json`; `DX_WATCH_PORTS` (space-separated) overrides for tests.
- Comments say why, once, and end with a period. No history narration.
- Run `pnpm format` before every commit (oxfmt also formats `.md` and `.json`).
- Commit messages: `scope: description`. Update `.agents/projects/agent-directives/TASKS.md` in the same commit as the code it describes.

---

### Task 1: Phase state in the backend

**Files:**
- Modify: `.claude/scripts/mode.sh` (state vars near line 40, new `canonical_phase`, new `phase` case branch)
- Modify: `.gitignore:7-12`
- Modify: `.claude/scripts/mode.test.sh` (append section 11)

**Interfaces:**
- Produces: `bash .claude/scripts/mode.sh phase get` → prints `discuss|build|debug`; `mode.sh phase set <discuss|build|debug>` → writes `.claude/.phase`, creates `.claude/.debug` for `debug`, removes it otherwise, prints `Phase: BUILD`; `mode.sh debug get` → prints `on|off`. Exit 2 on bad arg.

- [ ] **Step 1: Write the failing tests**

Append before the final `printf '\n%s passed…'` in `.claude/scripts/mode.test.sh`:

```bash
phase="$sandbox/.claude/.phase"
debug="$sandbox/.claude/.debug"
reset_all() { rm -f "$state" "$focus" "$phase" "$debug"; }

echo '=== 11. the phase subcommand round-trips by hand'
reset_all
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
```

Also change every existing `reset()` definition use: replace the body of `reset()` with `rm -f "$state" "$focus" "$phase" "$debug"` and move the `phase=`/`debug=` variable definitions up next to `focus=` (line ~29) so earlier sections also start clean. Delete the `reset_all` helper once `reset` covers it, and use `reset` in section 11.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `bash .claude/scripts/mode.test.sh 2>&1 | tail -15`
Expected: section 11 checks FAIL (usage error exit 2 from the unknown `phase` verb, `debug get` unknown).

- [ ] **Step 3: Implement the phase backend**

In `.claude/scripts/mode.sh`, after `legacy="$root/.claude/.response-mode"` add:

```bash
phase="$root/.claude/.phase"
debug="$root/.claude/.debug"
```

After `canonical()` add:

```bash
# Anything that is not build or debug is discuss, so a stale or hand-edited file
# cannot wedge a session in an unknown phase.
canonical_phase() {
  case "$1" in
    build | debug) printf '%s' "$1" ;;
    *) printf 'discuss' ;;
  esac
}
read_phase() {
  [ -e "$phase" ] || return 0
  cat "$phase" 2>/dev/null || return 1
}
current_phase() {
  local value
  if ! value=$(read_phase); then
    printf 'WARNING: %s exists but could not be read; using discuss.\n' "$phase" >&2
    value=''
  fi
  canonical_phase "$value"
}
debug_on() { [ -e "$debug" ]; }
```

Add to the main `case` before `context)`:

```bash
  phase)
    case "${2:-get}" in
      get)
        current_phase; printf '\n'
        ;;
      set)
        case "${3:-}" in
          discuss | build | debug) next=$3 ;;
          *) printf 'usage: mode.sh phase set {discuss|build|debug}\n' >&2; exit 2 ;;
        esac
        write_file "$phase" "$next" || { printf 'ERROR: could not write %s\n' "$phase" >&2; exit 1; }
        # The flag rides on the phase: debug turns it on, any other phase turns it off.
        if [ "$next" = 'debug' ]; then
          write_file "$debug" 'on' || { printf 'ERROR: could not write %s\n' "$debug" >&2; exit 1; }
        else
          rm -f "$debug" 2>/dev/null || { printf 'ERROR: could not clear %s\n' "$debug" >&2; exit 1; }
        fi
        printf 'Phase: %s\n' "$(printf '%s' "$next" | tr '[:lower:]' '[:upper:]')"
        ;;
      *) printf 'usage: mode.sh phase {get|set <phase>}\n' >&2; exit 2 ;;
    esac
    ;;
  debug)
    if debug_on; then printf 'on\n'; else printf 'off\n'; fi
    ;;
```

Update the usage line at the bottom and the header comment block to list `phase get|set` and `debug get`.

In `.gitignore` after the `.claude/.focus` entry add:

```
# The phase (discuss|build|debug) and its debug flag — runtime, like the mode.
.claude/.phase
.claude/.debug
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `bash .claude/scripts/mode.test.sh 2>&1 | tail -15`
Expected: `… passed, 0 failed` with section 11 all PASS.

- [ ] **Step 5: Commit**

```bash
pnpm format
git add .claude/scripts/mode.sh .claude/scripts/mode.test.sh .gitignore
git commit -m "agent-directives: add the phase axis to the mode backend"
```

---

### Task 2: `/mode discuss|build|debug` in the hook; `focus` implies `build`

**Files:**
- Modify: `.claude/hooks/mode.sh:31` (`modes` alternation) and the `if [ -n "$sentinel" ]` block
- Modify: `.claude/scripts/mode.test.sh` (append section 12)

**Interfaces:**
- Consumes: `mode.sh phase set <phase>` from Task 1.
- Produces: typing `/mode discuss|build|debug` as the first line writes the phase; `/mode focus …` additionally runs `phase set build`.

- [ ] **Step 1: Write the failing tests**

Append to `.claude/scripts/mode.test.sh`:

```bash
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `bash .claude/scripts/mode.test.sh 2>&1 | grep -E 'FAIL|passed'`
Expected: 12a, 12d, 12e, 13a fail (phase never written).

- [ ] **Step 3: Implement the hook branch**

In `.claude/hooks/mode.sh` change:

```bash
modes='terse|concise|normal|natural|default|off|focus'
```

to:

```bash
modes='terse|concise|normal|natural|default|off|focus|discuss|build|debug'
```

Inside `if [ -n "$sentinel" ]; then`, after `value=$(…)`, add a new branch before `if [ "$value" = 'focus' ]`:

```bash
  case "$value" in
    discuss | build | debug)
      if bash "$script" phase set "$value" >/dev/null 2>&1; then
        printf 'Phase already set via `%s` — do not run the script yourself. Acknowledge the new phase in one short line; only treat the rest of the message as a task if it clearly contains one.\n' "$sentinel"
      else
        printf 'WARNING: failed to persist phase via `%s`; the phase may be stale. Tell the user.\n' "$sentinel"
      fi
      exec bash "$script" context
      ;;
  esac
```

In the focus branch, after the pin is written successfully (inside `elif bash "$script" focus set "$task" >/dev/null 2>&1; then`), add as the first statement:

```bash
      # A pinned task is something to execute, so focus also enters build.
      bash "$script" phase set build >/dev/null 2>&1 || printf 'WARNING: pinned, but the phase could not be set to build.\n'
```

Update the header comment (item 1c): `/mode discuss|build|debug` sets the phase only.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `bash .claude/scripts/mode.test.sh 2>&1 | grep -E 'FAIL|passed'`
Expected: `… passed, 0 failed`.

- [ ] **Step 5: Commit**

```bash
pnpm format
git add .claude/hooks/mode.sh .claude/scripts/mode.test.sh
git commit -m "agent-directives: /mode discuss|build|debug, focus implies build"
```

---

### Task 3: PHASE clause and DIAGNOSTICS footer in `context`

**Files:**
- Modify: `.claude/scripts/mode.sh` (`context)` branch)
- Modify: `.claude/scripts/mode.test.sh` (append section 14)

**Interfaces:**
- Consumes: `current_phase`, `debug_on` from Task 1.
- Produces: `context` output contains exactly one line starting `- PHASE: DISCUSS|BUILD|DEBUG`, emitted after the MODE clause and before any `- FOCUS:`; when the debug flag is on, a `DIAGNOSTICS:` block is the last thing before the closing "form only" clause.

- [ ] **Step 1: Write the failing tests**

```bash
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `bash .claude/scripts/mode.test.sh 2>&1 | grep -E 'FAIL|passed'`
Expected: 14a, 14b, 14d–14k fail.

- [ ] **Step 3: Implement the clauses**

In the `context)` branch, after the MODE `if/else` and before `pinned=$(current_focus)`, add:

```bash
    case "$(current_phase)" in
      discuss)
        cat <<'EOF'
- PHASE: DISCUSS — reply this turn with the answer, the decisions taken, and
  numbered options. Investigation over ~2 tool calls goes to a background
  subagent; say so and report when it lands. Designs and plans go to
  agents/superpowers/{specs,plans}/, not to long chat. Edits are fine when this
  turn asks for them; do not start implementation the user has not asked for.
  Switch with `/mode build`.
EOF
        ;;
      build)
        cat <<'EOF'
- PHASE: BUILD — run the agreed or pinned task to completion, commit, report.
  Anything expected to run past ~30s goes to the background. Switch with
  `/mode discuss`.
EOF
        ;;
      debug)
        cat <<'EOF'
- PHASE: DEBUG — the DISCUSS rules plus: reproduce first; one hypothesis at a
  time; instrument with @dxos/log and read the evidence (app.log, test.log,
  test-browser.log, the watcher's last capture); confirm the root cause before
  proposing a fix; no fix and no cleanup until it is confirmed. Switch with
  `/mode build` or `/mode discuss`.
EOF
        ;;
    esac
```

Immediately before the final `cat <<'EOF'` that prints "These govern form only", add:

```bash
    if debug_on; then
      # Raw values beside canonical ones, so a hook fault and an agent fault look different.
      pin_source='none'
      if [ -n "$pinned" ]; then pin_source='file'; fi
      printf 'DIAGNOSTICS: (debug flag on; `/mode build` or `/mode discuss` turns it off)\n'
      printf '  mode:  %s = %s -> %s\n' "$state" "$(read_state 2>/dev/null || printf '<unreadable>')" "$(current)"
      printf '  phase: %s = %s -> %s\n' "$phase" "$(read_phase 2>/dev/null || printf '<unreadable>')" "$(current_phase)"
      printf '  focus: %s (%s)\n' "$focus" "$pin_source"
      printf '  elapsed: %ss\n' "$SECONDS"
    fi
```

(`$SECONDS` is bash's seconds-since-start; it is the hook's own runtime to one-second precision, which is enough to spot a stalled probe.)

- [ ] **Step 4: Run the tests to verify they pass**

Run: `bash .claude/scripts/mode.test.sh 2>&1 | grep -E 'FAIL|passed'`
Expected: `… passed, 0 failed`.

- [ ] **Step 5: Commit**

```bash
pnpm format
git add .claude/scripts/mode.sh .claude/scripts/mode.test.sh
git commit -m "agent-directives: PHASE clause and DIAGNOSTICS footer in the per-turn block"
```

---

### Task 4: Round-robin watcher singleton with a status file

**Files:**
- Modify: `tools/storybook-react/diagnose.sh` (options, layout, `capture` signature, new discovery/cycle/status/ensure/restart)
- Modify: `tools/storybook-react/serve.sh:48` (`--ensure` no longer needs `--port`)
- Create: `tools/storybook-react/diagnose.test.sh`

**Interfaces:**
- Produces: `bash tools/storybook-react/diagnose.sh --status` prints either `unwatched — run bash tools/storybook-react/diagnose.sh --ensure` (exit 0) or a header line `port pid kind worktree state age last-capture` followed by tab-separated rows. `--once` runs one discovery/probe/write cycle and exits (test seam). `--ensure` starts the singleton if none; `--restart` replaces it. Status file: `${DX_WATCH_DIR:-$HOME/.cache/dxos/watch}/status`. Env: `DX_WATCH_DIR`, `DX_WATCH_PORTS`.
- States: `answered|wedged|starting|unbound|gone`.

- [ ] **Step 1: Write the failing test**

Create `tools/storybook-react/diagnose.test.sh`:

```bash
#!/usr/bin/env bash
#
# Copyright 2026 DXOS.org
#
# Tests for the watcher's discovery, status file, and --status against a throwaway
# HTTP listener. Run: bash tools/storybook-react/diagnose.test.sh

set -uo pipefail

repo=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
script="$repo/tools/storybook-react/diagnose.sh"
sandbox=$(mktemp -d)
export DX_WATCH_DIR="$sandbox/watch"
trap 'rm -rf "$sandbox"; [ -n "${server:-}" ] && kill "$server" 2>/dev/null' EXIT

pass=0; fail=0
check() {
  local label=$1 expected=$2 actual=$3
  if [ "$expected" = "$actual" ]; then printf 'PASS  %s\n' "$label"; pass=$((pass + 1))
  else printf 'FAIL  %s\n        expected: %s\n        actual:   %s\n' "$label" "$expected" "$actual"; fail=$((fail + 1)); fi
}
row() { awk -F'\t' -v port="$1" '$1 == port' "$DX_WATCH_DIR/status"; }
col() { row "$1" | cut -f"$2"; }

# A free port: bind 0 through python and read back what it chose.
port=$(python3 -c 'import socket; s=socket.socket(); s.bind(("127.0.0.1",0)); print(s.getsockname()[1]); s.close()')
mkdir -p "$sandbox/www" && printf '{}' > "$sandbox/www/index.json"
(cd "$sandbox/www" && exec python3 -m http.server "$port" --bind 127.0.0.1 > /dev/null 2>&1) &
server=$!
until curl -sf -m 1 -o /dev/null "http://127.0.0.1:$port/"; do sleep 0.2; done
export DX_WATCH_PORTS="$port 1"

echo '=== 1. --status with no watcher says unwatched'
check '1a unwatched' '1' "$(bash "$script" --status | grep -c '^unwatched')"
check '1b exit 0' '0' "$(bash "$script" --status > /dev/null; echo $?)"

echo '=== 2. one cycle discovers the listener and the unbound port'
bash "$script" --once --timeout 2 > /dev/null 2>&1
check '2a status file written' 'yes' "$([ -f "$DX_WATCH_DIR/status" ] && echo yes || echo no)"
check '2b listener answered' 'answered' "$(col "$port" 5)"
check '2c pid recorded' "$server" "$(col "$port" 2)"
check '2d kind is vite (not storybook)' 'vite' "$(col "$port" 3)"
check '2e worktree is the cwd' "$sandbox/www" "$(col "$port" 4)"
check '2f port 1 unbound' 'unbound' "$(col 1 5)"

echo '=== 3. --status prints the table when a watcher pid is alive'
printf '%s' "$$" > "$DX_WATCH_DIR/watcher.pid"
out=$(bash "$script" --status)
check '3a header' '1' "$(printf '%s' "$out" | grep -c '^port')"
check '3b row for the listener' '1' "$(printf '%s' "$out" | grep -c "^$port	")"
printf '99999999' > "$DX_WATCH_DIR/watcher.pid"
check '3c dead pid is unwatched' '1' "$(bash "$script" --status | grep -c '^unwatched')"

echo '=== 4. a vanished server is gone for one cycle, then unbound'
kill "$server"; wait "$server" 2>/dev/null; server=''
bash "$script" --once --timeout 2 > /dev/null 2>&1
check '4a gone' 'gone' "$(col "$port" 5)"
bash "$script" --once --timeout 2 > /dev/null 2>&1
check '4b unbound' 'unbound' "$(col "$port" 5)"

echo '=== 5. known_ports merges launch.json with the defaults'
unset DX_WATCH_PORTS
ports=$(bash "$script" --ports)
check '5a includes 9009' '1' "$(printf '%s\n' "$ports" | grep -cx 9009)"
check '5b includes 5199' '1' "$(printf '%s\n' "$ports" | grep -cx 5199)"
check '5c includes a launch.json port' '1' "$(printf '%s\n' "$ports" | grep -cx 5180)"
check '5d de-duplicated' "$(printf '%s\n' "$ports" | sort -u | wc -l | tr -d ' ')" "$(printf '%s\n' "$ports" | wc -l | tr -d ' ')"

printf '\n%s passed, %s failed\n' "$pass" "$fail"
[ "$fail" -eq 0 ]
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bash tools/storybook-react/diagnose.test.sh 2>&1 | grep -E 'FAIL|passed'`
Expected: everything fails (`unknown option: --status` exits 2).

- [ ] **Step 3: Rewrite the option and layout section**

In `tools/storybook-react/diagnose.sh`, replace the header usage comment (lines 4–18) with:

```bash
# Capture why a dev server is wedged, BEFORE restarting it — a restart destroys the only evidence.
#
#   bash tools/storybook-react/diagnose.sh --port 9009   # capture that server now
#   bash tools/storybook-react/diagnose.sh --status      # what the watcher knows about every known port
#   bash tools/storybook-react/diagnose.sh --ensure      # start the machine-wide watcher if none runs
#   bash tools/storybook-react/diagnose.sh --restart     # replace a running watcher with this checkout's
#
# ONE watcher per machine polls every known port (launch.json + 9009/5199) round-robin, rewrites a
# status file each cycle, and captures the moment a server stops answering or pegs a core. The
# agent's per-turn context reads that file, so nothing probes a wedged server on the hot path.
#
# Options: --interval N (15s) --timeout N (10s, "answered" deadline) --port N (manual capture only)
# Env:     DX_WATCH_DIR (~/.cache/dxos/watch)  DX_WATCH_PORTS ("9009 5199", overrides discovery)
```

Replace the option variables and parser with:

```bash
PORT=9009
INTERVAL=15
TIMEOUT=10
# Seconds after a server starts during which a pegged core is warm-up, not a wedge.
WARMUP=300
MODE=capture

number_arg() { … unchanged … }

while [ $# -gt 0 ]; do
  case "$1" in
    --watch) MODE=watch ;;
    --once) MODE=once ;;
    --status) MODE=status ;;
    --ensure) MODE=ensure ;;
    --restart) MODE=restart ;;
    --ports) MODE=ports ;;
    --port) PORT="$(number_arg "$1" "${2-}")"; shift ;;
    --interval) INTERVAL="$(number_arg "$1" "${2-}")"; shift ;;
    --timeout) TIMEOUT="$(number_arg "$1" "${2-}")"; shift ;;
    -h|--help) sed -n '4,16p' "${BASH_SOURCE[0]}"; exit 0 ;;
    *) echo "unknown option: $1" >&2; exit 2 ;;
  esac
  shift
done

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
WATCH_DIR="${DX_WATCH_DIR:-$HOME/.cache/dxos/watch}"
PIDFILE="$WATCH_DIR/watcher.pid"
STATUS="$WATCH_DIR/status"
WATCH_LOG="$WATCH_DIR/watcher.log"
```

Drop `--wait`/`WAIT` (the round-robin loop never waits for a port; an unbound port is a row).

- [ ] **Step 4: Parameterise `capture` by port and worktree**

Change `capture() { local pid="$1" reason="$2"` to:

```bash
# Captures land in the tree that owns the server, so the report sits beside its own cache and log.
capture() {
  local port="$1" pid="$2" reason="$3" tree="${4:-$ROOT}"
  local out_dir="$tree/temp"
  local cache="$tree/tools/storybook-react/node_modules/.cache/storybook"
```

Inside the function replace every `${PORT}` with `${port}`, every `${OUT_DIR}` with `${out_dir}`, every `${CACHE}` with `${cache}`, and `${ROOT}/tools/storybook-react/app.log` with `${tree}/tools/storybook-react/app.log`. Delete the old `OUT_DIR=` and `CACHE=` globals. The function must end by printing `Captured: ${out}` as it does today; the loop parses that line.

- [ ] **Step 5: Add discovery helpers**

After `cpu_of()` add:

```bash
known_ports() {
  if [ -n "${DX_WATCH_PORTS:-}" ]; then
    printf '%s\n' $DX_WATCH_PORTS
    return
  fi
  {
    printf '9009\n5199\n'
    [ -f "$ROOT/.claude/launch.json" ] && jq -r '.configurations[].port // empty' "$ROOT/.claude/launch.json" 2>/dev/null
  } | grep -E '^[0-9]+$' | sort -un
}
listener_pid() { lsof -ti ":$1" -sTCP:LISTEN 2>/dev/null | head -1; }
pid_cwd() { lsof -a -p "$1" -d cwd -Fn 2>/dev/null | sed -n 's/^n//p' | head -1; }
# The toplevel when the cwd is inside a checkout, else the cwd itself; either way one path per server.
pid_tree() {
  local cwd
  cwd=$(pid_cwd "$1")
  [ -n "$cwd" ] || return 0
  git -C "$cwd" rev-parse --show-toplevel 2>/dev/null || printf '%s' "$cwd"
}
pid_kind() {
  if ps -o command= -p "$1" 2>/dev/null | grep -q 'storybook'; then printf 'storybook'; else printf 'vite'; fi
}
pid_age() { ps -o etimes= -p "$1" 2>/dev/null | tr -d ' '; }
pid_etime() { ps -o etime= -p "$1" 2>/dev/null | tr -d ' '; }
probe_path() { if [ "$1" = storybook ]; then printf '/index.json'; else printf '/'; fi; }
answers() { curl -sf -m "$TIMEOUT" -o /dev/null "http://localhost:$1$(probe_path "$2")"; }
```

- [ ] **Step 6: Add the per-cycle state helpers and the cycle**

bash 3.2 has no associative arrays, so per-pid hot counters and per-port wedge markers are files under `$WATCH_DIR`:

```bash
hot_get() { cat "$WATCH_DIR/hot/$1" 2>/dev/null || printf 0; }
hot_set() { mkdir -p "$WATCH_DIR/hot" && printf '%s' "$2" > "$WATCH_DIR/hot/$1"; }
hot_prune() {
  # Counters for pids no longer listening would otherwise survive a restart onto a reused pid.
  local keep=" $* " file
  for file in "$WATCH_DIR"/hot/*; do
    [ -e "$file" ] || continue
    case "$keep" in *" $(basename "$file") "*) ;; *) rm -f "$file" ;; esac
  done
}
wedge_path() { cat "$WATCH_DIR/wedged/$1" 2>/dev/null; }
wedge_set() { mkdir -p "$WATCH_DIR/wedged" && printf '%s' "$2" > "$WATCH_DIR/wedged/$1"; }
wedge_clear() { rm -f "$WATCH_DIR/wedged/$1" 2>/dev/null; }
last_capture() { cat "$WATCH_DIR/last/$1" 2>/dev/null || printf -- '-'; }
last_set() { mkdir -p "$WATCH_DIR/last" && printf '%s' "$2" > "$WATCH_DIR/last/$1"; }
previous_pid() { awk -F'\t' -v port="$1" '$1 == port { print $2 }' "$STATUS" 2>/dev/null; }

# One pass over every known port; rewrites the status file atomically at the end.
cycle() {
  mkdir -p "$WATCH_DIR"
  local tmp rows='' seen='' port pid kind tree age state reason cpu hot captured
  tmp=$(mktemp "$STATUS.XXXXXX") || return 1
  for port in $(known_ports); do
    pid=$(listener_pid "$port")
    if [ -z "$pid" ]; then
      wedge_clear "$port"
      previous=$(previous_pid "$port")
      if [ -n "$previous" ] && [ "$previous" != '-' ]; then state=gone; else state=unbound; fi
      rows="$rows$port	-	-	-	$state	-	$(last_capture "$port")
"
      continue
    fi
    seen="$seen $pid"
    kind=$(pid_kind "$pid")
    tree=$(pid_tree "$pid")
    age=$(pid_age "$pid")
    reason=''
    if [ -n "$(wedge_path "$port")" ]; then
      # Wait for the server to answer again before re-arming, so one wedge is one report.
      if answers "$port" "$kind"; then wedge_clear "$port"; state=answered; else state=wedged; fi
    elif ! answers "$port" "$kind"; then
      if [ -n "$age" ] && [ "$age" -lt "$WARMUP" ]; then state=starting; else reason="no response within ${TIMEOUT}s"; fi
    else
      state=answered
      cpu=$(cpu_of "$pid")
      hot=$(hot_get "$pid")
      if [ -n "$age" ] && [ "$age" -ge "$WARMUP" ] && [ -n "$cpu" ] && [ "${cpu%%.*}" -ge 90 ]; then
        hot=$((hot + 1))
        echo "$(date +%H:%M:%S) :$port cpu ${cpu}% (${hot}/3)"
        [ "$hot" -ge 3 ] && reason="cpu ${cpu}% sustained over 3 polls"
      else
        hot=0
      fi
      hot_set "$pid" "$hot"
    fi
    if [ -n "$reason" ]; then
      captured=$(capture "$port" "$pid" "$reason" "$tree" | sed -n 's/^Captured: //p')
      [ -n "$captured" ] && last_set "$port" "$captured"
      wedge_set "$port" "${captured:-pending}"
      hot_set "$pid" 0
      state=wedged
    fi
    rows="$rows$port	$pid	$kind	$tree	$state	$(pid_etime "$pid")	$(last_capture "$port")
"
  done
  hot_prune $seen
  printf '%s' "$rows" > "$tmp" && mv -f "$tmp" "$STATUS"
}
```

- [ ] **Step 7: Add the singleton verbs**

Replace everything from `# Already-running watcher for this port.` to the end of the file with:

```bash
watcher_alive() {
  local pid
  pid=$(cat "$PIDFILE" 2>/dev/null) || return 1
  [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null
}

print_status() {
  if ! watcher_alive; then
    echo "unwatched — run bash tools/storybook-react/diagnose.sh --ensure"
    return 0
  fi
  printf 'port\tpid\tkind\tworktree\tstate\tage\tlast-capture\n'
  cat "$STATUS" 2>/dev/null
  # Three missed cycles means the loop is stuck even though its pid is alive.
  local written now
  written=$(stat -f %m "$STATUS" 2>/dev/null || stat -c %Y "$STATUS" 2>/dev/null || echo 0)
  now=$(date +%s)
  if [ $((now - written)) -gt $((INTERVAL * 3)) ]; then
    echo "stale: status last written $((now - written))s ago; run --restart"
  fi
}

ensure() {
  mkdir -p "$WATCH_DIR"
  # `mkdir` is atomic, so two `serve` tasks racing cannot both spawn; a lock older than a minute
  # outlived whatever held it.
  local lock="$WATCH_DIR/.lock"
  if [ -d "$lock" ] && [ -z "$(find "$lock" -maxdepth 0 -mmin +1 2>/dev/null)" ]; then
    echo "another --ensure is starting the watcher."; return 0
  fi
  rmdir "$lock" 2>/dev/null || true
  mkdir "$lock" 2>/dev/null || { echo "another --ensure is starting the watcher."; return 0; }
  trap 'rmdir "$lock" 2>/dev/null || true' EXIT
  if watcher_alive; then
    echo "dev-server watcher already running (pid $(cat "$PIDFILE"))."; return 0
  fi
  nohup bash "${BASH_SOURCE[0]}" --watch --interval "$INTERVAL" --timeout "$TIMEOUT" >>"$WATCH_LOG" 2>&1 &
  disown 2>/dev/null || true
  echo "dev-server watcher started (log: $WATCH_LOG, status: $STATUS)."
}

stop_watcher() {
  local pid
  pid=$(cat "$PIDFILE" 2>/dev/null)
  [ -n "$pid" ] && kill "$pid" 2>/dev/null
  rm -f "$PIDFILE"
  # Per-port watchers from before the singleton would keep duplicating captures.
  pgrep -f 'diagnose\.sh --watch --port' 2>/dev/null | xargs kill 2>/dev/null || true
}

case "$MODE" in
  ports) known_ports ;;
  status) print_status ;;
  once) cycle ;;
  ensure) ensure ;;
  restart) stop_watcher; sleep 1; ensure ;;
  capture)
    pid=$(listener_pid "$PORT")
    [ -n "$pid" ] || { echo "Nothing listening on :$PORT."; exit 1; }
    capture "$PORT" "$pid" manual "$(pid_tree "$pid")"
    ;;
  watch)
    mkdir -p "$WATCH_DIR"
    printf '%s' "$$" > "$PIDFILE"
    trap 'rm -f "$PIDFILE"' EXIT
    echo "$(date +%H:%M:%S) watching $(known_ports | tr '\n' ' ')every ${INTERVAL}s."
    while true; do
      cycle
      sleep "$INTERVAL"
    done
    ;;
esac
```

In `tools/storybook-react/serve.sh` line 48 change `--ensure --port "${PORT}"` to `--ensure` (the watcher discovers the port).

- [ ] **Step 8: Run the test to verify it passes**

Run: `bash tools/storybook-react/diagnose.test.sh 2>&1 | grep -E 'FAIL|passed'`
Expected: `… passed, 0 failed`. Also `bash -n tools/storybook-react/diagnose.sh` and `bash -n tools/storybook-react/serve.sh` print nothing.

- [ ] **Step 9: Smoke it against the real machine, read-only**

Run: `DX_WATCH_DIR=$(mktemp -d) bash tools/storybook-react/diagnose.sh --once --timeout 3; cat "$DX_WATCH_DIR/status"` — expected a row for 9009 with `answered` and the `illustrator-selection-diagrams` toplevel (or whatever serves it at the time), and `unbound` for the rest. Do NOT run `--ensure` or `--restart` here: a live per-port watcher belongs to another session.

- [ ] **Step 10: Commit**

```bash
pnpm format
git add tools/storybook-react/diagnose.sh tools/storybook-react/diagnose.test.sh tools/storybook-react/serve.sh
git commit -m "storybook-react: one round-robin dev-server watcher with a status file"
```

---

### Task 5: SERVERS block in `context`

**Files:**
- Modify: `.claude/scripts/mode.sh` (`context)` branch, after FOCUS)
- Modify: `.claude/scripts/mode.test.sh` (sandbox setup + section 15)

**Interfaces:**
- Consumes: `diagnose.sh --status` output format from Task 4 (`unwatched…` line, or header + tab rows with worktree in column 4).
- Produces: a `SERVERS:` block: either `SERVERS: unwatched — run bash tools/storybook-react/diagnose.sh --ensure` or one line per row `  :9009 storybook answered 4h12m illustrator-selection-diagrams [THIS]`, with `[THIS]` only when column 4 equals this checkout's toplevel.

- [ ] **Step 1: Write the failing tests**

In the sandbox setup of `mode.test.sh`, after the two `ln -s` lines add:

```bash
mkdir -p "$sandbox/tools"
ln -s "$repo/tools/storybook-react" "$sandbox/tools/storybook-react"
export DX_WATCH_DIR="$sandbox/watch"
git -C "$sandbox" init -q 2>/dev/null
```

Append:

```bash
echo '=== 15. context renders the SERVERS block from the watcher status'
reset
out=$(run "$(payload 'hi')")
check '15a unwatched line' '1' "$(printf '%s' "$out" | grep -c '^SERVERS: unwatched')"
mkdir -p "$DX_WATCH_DIR"
printf '%s' "$$" > "$DX_WATCH_DIR/watcher.pid"
top=$(git -C "$sandbox" rev-parse --show-toplevel)
printf '9009\t111\tstorybook\t%s\tanswered\t01:02\t-\n5199\t-\t-\t-\tunbound\t-\t-\n5180\t222\tvite\t/elsewhere\twedged\t00:10\t/elsewhere/temp/x\n' "$top" > "$DX_WATCH_DIR/status"
out=$(run "$(payload 'hi')")
check '15b this worktree flagged' '1' "$(printf '%s' "$out" | grep -c '^  :9009 storybook answered 01:02 .* \[THIS\]$')"
check '15c other worktree not flagged' '1' "$(printf '%s' "$out" | grep -c '^  :5180 vite wedged 00:10 /elsewhere$')"
check '15d unbound row shown' '1' "$(printf '%s' "$out" | grep -c '^  :5199 unbound$')"
check '15e wedged row names its capture in debug' '0' "$(printf '%s' "$out" | grep -c 'capture: /elsewhere/temp/x')"
run "$(payload '/mode debug')" > /dev/null
out=$(run "$(payload 'hi')")
check '15f debug adds the capture path' '1' "$(printf '%s' "$out" | grep -c 'capture: /elsewhere/temp/x')"
rm -rf "$DX_WATCH_DIR"
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `bash .claude/scripts/mode.test.sh 2>&1 | grep -E 'FAIL|passed'`
Expected: 15a–15d, 15f fail.

- [ ] **Step 3: Implement the block**

In `mode.sh`, after the FOCUS `if` block and before the diagnostics footer, add:

```bash
    servers_block() {
      local diagnose="$root/tools/storybook-react/diagnose.sh" here status line
      [ -f "$diagnose" ] || return 0
      here=$(git -C "$root" rev-parse --show-toplevel 2>/dev/null || printf '%s' "$root")
      status=$(bash "$diagnose" --status 2>/dev/null) || return 0
      case "$status" in
        unwatched*) printf 'SERVERS: %s\n' "$status"; return 0 ;;
      esac
      printf 'SERVERS: (from the dev-server watcher; [THIS] = serves this worktree)\n'
      printf '%s\n' "$status" | tail -n +2 | while IFS=$'\t' read -r port pid kind tree state age last; do
        [ -n "$port" ] || continue
        case "$port" in stale:*) printf '  %s\n' "$port $pid $kind $tree $state $age $last"; continue ;; esac
        if [ "$state" = unbound ]; then
          printf '  :%s unbound\n' "$port"
        else
          line=":$port $kind $state $age $tree"
          [ "$tree" = "$here" ] && line="$line [THIS]"
          printf '  %s\n' "$line"
          if debug_on && [ "$last" != '-' ]; then printf '    capture: %s\n' "$last"; fi
        fi
      done
    }
    servers_block
```

The `stale:` line from `--status` is a single field and falls through the first `read`, which is why it is re-joined and printed as is.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `bash .claude/scripts/mode.test.sh 2>&1 | grep -E 'FAIL|passed'`
Expected: `… passed, 0 failed`.

- [ ] **Step 5: Commit**

```bash
pnpm format
git add .claude/scripts/mode.sh .claude/scripts/mode.test.sh
git commit -m "agent-directives: SERVERS block in the per-turn context, fed by the watcher"
```

---

### Task 6: CHECKLIST lines in `context`

**Files:**
- Modify: `.claude/scripts/mode.sh` (`context)` branch, after SERVERS)
- Modify: `.claude/scripts/mode.test.sh` (append section 16)

**Interfaces:**
- Produces: a `CHECKLIST:` block of three lines, always emitted, between SERVERS and DIAGNOSTICS.

- [ ] **Step 1: Write the failing tests**

```bash
echo '=== 16. the checklist is emitted every turn, after servers'
reset
out=$(run "$(payload 'hi')")
check '16a checklist present' '1' "$(printf '%s' "$out" | grep -c '^CHECKLIST:')"
check '16b foreground line' '1' "$(printf '%s' "$out" | grep -c 'run_in_background')"
check '16c priority line' '1' "$(printf '%s' "$out" | grep -c 'FOCUS pin, then the project')"
check '16d worktree line' '1' "$(printf '%s' "$out" | grep -c 'serve THIS worktree')"
check '16e after servers, before form clause' 'ordered' "$(
  printf '%s' "$out" | awk '/^SERVERS:/{s=NR} /^CHECKLIST:/{c=NR} /govern form only/{f=NR} END{ if (s<c && c<f) print "ordered"; else print "misordered" }'
)"
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `bash .claude/scripts/mode.test.sh 2>&1 | grep -E 'FAIL|passed'`
Expected: 16a–16e fail.

- [ ] **Step 3: Implement**

After `servers_block` in `context)` add:

```bash
    cat <<'EOF'
CHECKLIST (answer to yourself before acting):
  - Foreground: will anything run past ~30s? Background it (run_in_background) and keep replying.
  - Priority: is it known? Authority order: the FOCUS pin, then the project's open task, then
    ask with numbered options. Never infer a priority from a tool result.
  - Worktree: does the server you are about to verify against serve THIS worktree? If not,
    say so before using it.
EOF
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `bash .claude/scripts/mode.test.sh 2>&1 | grep -E 'FAIL|passed'`
Expected: `… passed, 0 failed`.

- [ ] **Step 5: Commit**

```bash
pnpm format
git add .claude/scripts/mode.sh .claude/scripts/mode.test.sh
git commit -m "agent-directives: per-turn CHECKLIST in the context block"
```

---

### Task 7: Foreground guard on Bash

**Files:**
- Create: `.claude/hooks/guard-foreground.sh`
- Create: `.claude/hooks/guard-foreground.test.sh`
- Modify: `.claude/settings.json` (`PreToolUse` → `Bash` matcher gets a second hook)

**Interfaces:**
- Produces: for a Bash tool call whose `tool_input.command` matches a long-runner and `tool_input.run_in_background` is not `true`, stdout is `{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"ask","permissionDecisionReason":"…"}}`; otherwise no output. Exit 0 always.

- [ ] **Step 1: Write the failing test**

Create `.claude/hooks/guard-foreground.test.sh`:

```bash
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
  jq -nc --arg c "$1" --argjson bg "${2:-false}" '{tool_name:"Bash", tool_input:{command:$c, run_in_background:$bg}}' \
    | bash "$hook" | jq -r '.hookSpecificOutput.permissionDecision // "none"'
}

echo '=== asks on known long runners in the foreground'
check 'repo build' 'ask' "$(decision 'moon exec --on-failure continue --quiet :build')"
check 'moon run :build' 'ask' "$(decision 'moon run :build')"
check 'pnpm install' 'ask' "$(decision 'pnpm install')"
check 'test sweep' 'ask' "$(decision 'MOON_CONCURRENCY=4 moon run :test -- --no-file-parallelism')"
check 'serve task' 'ask' "$(decision 'moon run storybook-react:serve')"
check 'storybook dev' 'ask' "$(decision 'pnpm exec storybook dev --port 9009')"
check 'repo-wide format' 'ask' "$(decision 'pnpm format')"
check 'until loop' 'ask' "$(decision 'until curl -sf localhost:9009; do sleep 2; done')"
check 'foreground sleep' 'ask' "$(decision 'sleep 60')"

echo '=== silent when backgrounded or bounded'
check 'backgrounded build' 'none' "$(decision 'moon run :build' true)"
check 'single package build' 'none' "$(decision 'moon run echo:build')"
check 'single test file' 'none' "$(decision 'moon run echo:test -- src/foo.test.ts')"
check 'single package test' 'none' "$(decision 'moon run echo:test')"
check 'oxfmt on a path' 'none' "$(decision 'npx oxfmt --write packages/core/echo/src/foo.ts')"
check 'git status' 'none' "$(decision 'git status')"
check 'short sleep' 'none' "$(decision 'sleep 2')"
check 'empty command' 'none' "$(jq -nc '{tool_name:"Bash", tool_input:{}}' | bash "$hook" | jq -r '.hookSpecificOutput.permissionDecision // "none"')"

echo '=== the reason names the fix'
reason=$(jq -nc '{tool_name:"Bash", tool_input:{command:"pnpm install"}}' | bash "$hook" | jq -r '.hookSpecificOutput.permissionDecisionReason')
check 'mentions run_in_background' '1' "$(printf '%s' "$reason" | grep -c run_in_background)"

printf '\n%s passed, %s failed\n' "$pass" "$fail"
[ "$fail" -eq 0 ]
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bash .claude/hooks/guard-foreground.test.sh 2>&1 | grep -E 'FAIL|passed'`
Expected: every `ask` case fails (hook missing → `none`).

- [ ] **Step 3: Implement the guard**

Create `.claude/hooks/guard-foreground.sh`:

```bash
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
```

Note the single-package `:test` line exits 0 early on purpose: `moon run echo:test` is bounded enough, and the sweep regex above already caught `:test` with a leading colon. The test `single package test` pins that.

In `.claude/settings.json`, add to the `PreToolUse` entry whose `matcher` is `Bash`, after the guard-branch hook:

```json
{
  "type": "command",
  "command": "bash \"${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null)}/.claude/hooks/guard-foreground.sh\"",
  "statusMessage": "Checking for a foreground long-runner"
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `bash .claude/hooks/guard-foreground.test.sh 2>&1 | grep -E 'FAIL|passed'` and `jq . .claude/settings.json > /dev/null`
Expected: `… passed, 0 failed`; jq prints nothing.

- [ ] **Step 5: Commit**

```bash
pnpm format
git add .claude/hooks/guard-foreground.sh .claude/hooks/guard-foreground.test.sh .claude/settings.json
git commit -m "agent-directives: ask before a long-running Bash command holds the foreground"
```

---

### Task 8: Documentation and ledger

**Files:**
- Modify: `AGENTS.md` "Responding to the user" (after the `/mode focus` bullet) and "Build, test, lint" storybook bullet
- Modify: `.claude/CLAUDE.md` "Mode" section
- Modify: `.claude/README.md` §C table row for `hooks/mode.sh`, add a row for `guard-foreground.sh`
- Modify: `.claude/commands/mode.md` (argument-hint, the re-orientation report)
- Modify: `tools/storybook-react/README.md`, `REPOSITORY_GUIDE.md:170-195`
- Modify: `.agents/projects/agent-directives/TASKS.md` (phase 6 boxes)

- [ ] **Step 1: AGENTS.md**

After the `/mode focus` bullet add:

```markdown
- **Phase is the second axis: `/mode discuss` | `/mode build` | `/mode debug`.**
  `discuss` (the default) answers every turn with decisions and numbered
  options and pushes long investigation to background subagents; `build` runs
  the agreed task to completion; `debug` is `discuss` plus the systematic
  debugging discipline (reproduce, one hypothesis, instrument, root cause before
  any fix). `/mode focus` also enters `build`. The per-turn block adds a
  `SERVERS:` table from the dev-server watcher and a three-line `CHECKLIST`.
```

In "Build, test, lint" change the storybook bullet's watcher sentence to: "`serve` starts one machine-wide watcher (`tools/storybook-react/diagnose.sh --ensure`) that polls every known dev-server port; `--status` shows what it knows, and the per-turn `SERVERS:` block is that table."

- [ ] **Step 2: `.claude/CLAUDE.md`**

In "Mode", add a bullet after the `/mode focus` one:

```markdown
- **`/mode discuss|build|debug`** writes `.claude/.phase` (default `discuss`);
  `debug` also creates `.claude/.debug`, which makes `context` append a
  `DIAGNOSTICS:` footer. `focus` sets the phase to `build`. State files, like the
  mode, are untracked and written only by `scripts/mode.sh`.
- `context` also renders `SERVERS:` (from `tools/storybook-react/diagnose.sh
  --status`, env `DX_WATCH_DIR`) and `CHECKLIST`. Tests: `bash
  .claude/scripts/mode.test.sh`, `bash tools/storybook-react/diagnose.test.sh`,
  `bash .claude/hooks/guard-foreground.test.sh`.
```

- [ ] **Step 3: `.claude/README.md`**

In the §C table, change the `hooks/mode.sh` row's State cell to `**persisted** .claude/.mode + .phase + .focus + .debug` and add a row:

```markdown
| [`hooks/guard-foreground.sh`](./hooks/guard-foreground.sh)                                                       | `PreToolUse(Bash)`        | ask            | derived                                   |
```

- [ ] **Step 4: `.claude/commands/mode.md`**

Change the frontmatter `argument-hint` to `'[terse|normal|focus [task]|discuss|build|debug]'` and the description to `Show or set the response mode (terse | normal | focus [task]) and phase (discuss | build | debug)`. Add `bash .claude/scripts/mode.sh phase get; bash tools/storybook-react/diagnose.sh --status;` to the report command. Add a paragraph after the focus one:

```markdown
**If `$ARGUMENTS` named a phase** (`discuss`, `build`, `debug`), it is already
applied — confirm in one line.
```

And extend re-orientation item 3: "…and the current phase with the other phases' commands on the same line, then the SERVERS table from the command above."

- [ ] **Step 5: Storybook docs**

`tools/storybook-react/README.md`: add a "Hang watcher" section:

```markdown
## Hang watcher

`serve.sh` runs `diagnose.sh --ensure`, which starts ONE watcher per machine
(`~/.cache/dxos/watch/`). It polls every known dev-server port (`.claude/launch.json`
plus 9009/5199) every 15s, rewrites `status`, and captures a wedged server to
`<its worktree>/temp/`. `diagnose.sh --status` prints the table; `--restart`
replaces a running watcher with this checkout's script. Tests:
`bash tools/storybook-react/diagnose.test.sh`.
```

`REPOSITORY_GUIDE.md` lines 174–190: replace the `--watch` line in the code block with `--status` and `--restart`, and reword the paragraph to say one machine-wide watcher discovers ports rather than one per server.

- [ ] **Step 6: Ledger and run everything**

In `.agents/projects/agent-directives/TASKS.md` phase 6, tick the four implementation boxes.

Run all three suites and syntax checks:

```bash
bash .claude/scripts/mode.test.sh | tail -1
bash tools/storybook-react/diagnose.test.sh | tail -1
bash .claude/hooks/guard-foreground.test.sh | tail -1
bash -n .claude/hooks/mode.sh .claude/scripts/mode.sh .claude/hooks/guard-foreground.sh tools/storybook-react/diagnose.sh tools/storybook-react/serve.sh
```

Expected: three `0 failed` lines, no syntax output.

- [ ] **Step 7: Commit**

```bash
pnpm format
git add AGENTS.md .claude/CLAUDE.md .claude/README.md .claude/commands/mode.md tools/storybook-react/README.md REPOSITORY_GUIDE.md .agents/projects/agent-directives/TASKS.md
git commit -m "agent-directives: document the phase axis, watcher, checklist and foreground guard"
```

---

## Self-review

- **Spec coverage.** §1 state → Tasks 1–2. §2 block order and clauses → Tasks 3, 5, 6 (PHASE, SERVERS, CHECKLIST, DIAGNOSTICS). §3 watcher layout, cycle, states, verbs → Task 4; `context` integration → Task 5. §4 guard → Task 7. §5 tests → each task; docs → Task 8. §6 out-of-scope items have no task.
- **Ordering.** Task 3 emits PHASE before FOCUS; Task 5 inserts SERVERS after FOCUS; Task 6 inserts CHECKLIST after SERVERS; Task 3's DIAGNOSTICS stays last before the closing clause. Test 14d, 15, 16e pin the order.
- **Names.** `current_phase`, `read_phase`, `debug_on`, `phase set`, `debug get` are used identically in Tasks 1, 2, 3, 5. Status columns (port, pid, kind, worktree, state, age, last-capture) are the same in Task 4's `cycle`, `print_status`, and Task 5's `read`.
- **Known gap accepted.** The wedge path in Task 4 (`reason` set → capture) is exercised only by the unchanged CPU/curl logic, not by a test; forcing a wedge needs a hanging listener and a 300s warm-up override. If a test is wanted later, add `--warmup N` and a `python3` socket that accepts but never responds.
