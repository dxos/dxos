#!/usr/bin/env bash
#
# Copyright 2026 DXOS.org
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
# Seams:   --once (one cycle) --ports (discovered ports) --etime-seconds STR (elapsed-time maths)
#          --reap-legacy [PORT] (kill per-port watchers; a PORT narrows it to one, for tests)
#          --sanitize STR (the status-field flattening) DX_REAP_MATCH (narrows --ensure's reap)

set -uo pipefail

PORT=9009
INTERVAL=15
TIMEOUT=10
# Seconds after a server starts during which a pegged core is warm-up, not a wedge.
WARMUP=300
MODE=capture
ETIME=''
REAP_MATCH=''
SANITIZE=''

# `set -u` would abort on a bare `$2`, losing the exit-2 path below; and an unvalidated value lets
# `--port --status` silently consume the next flag as the port.
number_arg() {
  case "${2-}" in
    '' | *[!0-9]*) echo "$1 needs a number" >&2; exit 2 ;;
  esac
  # Zero is not merely small here: `curl -m 0` disables the deadline entirely, so a wedged server
  # would never be detected, and a zero interval spins.
  if [ "$2" -eq 0 ]; then
    echo "$1 must be greater than zero" >&2
    exit 2
  fi
  echo "$2"
}

while [ $# -gt 0 ]; do
  case "$1" in
    --watch) MODE=watch ;;
    --once) MODE=once ;;
    --status) MODE=status ;;
    --ensure) MODE=ensure ;;
    --restart) MODE=restart ;;
    --ports) MODE=ports ;;
    # The optional port narrows the kill to one process, so a test can exercise this
    # against its own fake without signalling a watcher it did not start.
    --reap-legacy)
      MODE=reap
      case "${2-}" in
        '' | -*) ;;
        *) REAP_MATCH="$2"; shift ;;
      esac ;;
    # Consuming a missing operand would leave `$#` at 1 and spin the parser, so guard before shifting.
    --etime-seconds)
      [ $# -ge 2 ] || { echo "$1 needs an elapsed-time string" >&2; exit 2; }
      ETIME="$2"; MODE=etime; shift ;;
    --sanitize)
      [ $# -ge 2 ] || { echo "$1 needs a string" >&2; exit 2; }
      SANITIZE="$2"; MODE=sanitize; shift ;;
    --port) PORT="$(number_arg "$1" "${2-}")"; shift ;;
    --interval) INTERVAL="$(number_arg "$1" "${2-}")"; shift ;;
    --timeout) TIMEOUT="$(number_arg "$1" "${2-}")"; shift ;;
    -h|--help) sed -n '4,19p' "${BASH_SOURCE[0]}"; exit 0 ;;
    *) echo "unknown option: $1" >&2; exit 2 ;;
  esac
  shift
done

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
WATCH_DIR="${DX_WATCH_DIR:-$HOME/.cache/dxos/watch}"
PIDFILE="$WATCH_DIR/watcher.pid"
STATUS="$WATCH_DIR/status"
WATCH_LOG="$WATCH_DIR/watcher.log"
# Global because the EXIT trap that releases it expands the name after `ensure` has returned.
LOCK="$WATCH_DIR/.lock"

# Total CPU% across the process's threads; a wedged server sits at ~100 on one core.
cpu_of() {
  ps -o %cpu= -p "$1" 2>/dev/null | tr -d ' '
}

# The override shares discovery's filter and de-duplication, so a typo or a repeat cannot add a row.
known_ports() {
  {
    if [ -n "${DX_WATCH_PORTS:-}" ]; then
      printf '%s\n' $DX_WATCH_PORTS
    else
      printf '9009\n5199\n'
      [ -f "$ROOT/.claude/launch.json" ] && jq -r '.configurations[].port // empty' "$ROOT/.claude/launch.json" 2>/dev/null
    fi
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
pid_etime() { ps -o etime= -p "$1" 2>/dev/null | tr -d ' '; }
# macOS `ps` has no `etimes` keyword and answers an unknown one on stdout, so seconds are derived
# from the [[dd-]hh:]mm:ss elapsed field rather than asked for. Reachable as `--etime-seconds` so
# the arithmetic that arms the warm-up guard has a test seam.
etime_seconds() {
  printf '%s' "$1" | awk -F'[-:]' '
    NF == 4 { print ((($1 * 24 + $2) * 60) + $3) * 60 + $4 }
    NF == 3 { print (($1 * 60) + $2) * 60 + $3 }
    NF == 2 { print $1 * 60 + $2 }'
}
pid_age() {
  local etime
  etime=$(pid_etime "$1")
  [ -n "$etime" ] || return 0
  etime_seconds "$etime"
}
probe_path() { if [ "$1" = storybook ]; then printf '/index.json'; else printf '/'; fi; }
answers() { curl -sf -m "$TIMEOUT" -o /dev/null "http://localhost:$1$(probe_path "$2")"; }

# Captures land in the tree that owns the server, so the report sits beside its own cache and log.
capture() {
  local port="$1" pid="$2" reason="$3" tree="${4:-$ROOT}" kind="${5:-$(pid_kind "$2")}"
  local out_dir="$tree/temp"
  local cache="$tree/tools/storybook-react/node_modules/.cache/storybook"
  # A plain vite server has no `/index.json`, so the report must probe what `cycle` probed.
  local probe
  probe="$(probe_path "$kind")"
  mkdir -p "${out_dir}" || { echo "cannot write to ${out_dir}" >&2; return 1; }
  # `mktemp`, not a timestamp: two captures in the same second (a second watcher, or a manual run
  # racing the automatic one) would otherwise share a path and truncate each other's report.
  local out
  out="$(mktemp "${out_dir}/storybook-diagnosis-$(date +%Y%m%d-%H%M%S)-XXXXXX")" || {
    echo "cannot allocate a report file in ${out_dir}" >&2
    return 1
  }

  {
    echo "=== ${kind} :${port} pid ${pid} @ $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="
    echo "trigger: ${reason}"
    echo

    echo "--- process ---"
    ps -o pid,ppid,%cpu,%mem,rss,etime,time,state,command -p "${pid}"
    echo
    echo "--- per-thread CPU (is it the main thread or a worker?) ---"
    ps -M -p "${pid}" 2>/dev/null | head -20
    echo

    echo "--- every storybook/vite process ---"
    echo "Orphans from earlier runs keep a monorepo-wide watcher and ~1-2GB each, so they starve the"
    echo "live server and confound this report. More than one server here is itself a finding."
    ps ax -o pid,ppid,%cpu,rss,etime,command | grep -Ei "storybook|vite dev" | grep -v grep
    echo

    echo "--- responsive? ---"
    curl -sf -m "${TIMEOUT}" -o /dev/null -w "probe ${probe}: HTTP %{http_code} in %{time_total}s\n" \
      "http://localhost:${port}${probe}" || echo "probe ${probe}: NO RESPONSE within ${TIMEOUT}s"
    echo

    echo "--- vite dep optimizer ---"
    echo "The leading hypothesis is a re-optimization storm: serving all of @dxos/** from source means"
    echo "each new story can discover new deps, forcing a re-bundle and a reload that discovers more."
    echo "A 'deps_temp_*' directory exists ONLY while a re-optimization is in flight, so finding one"
    echo "here confirms it; a '_metadata.json' written seconds ago says the same."
    if [ -d "${cache}" ]; then
      # Its mtime is when the optimizer last rewrote the bundle; seconds ago means a storm.
      find "${cache}" -maxdepth 5 -name '_metadata.json' -path '*sb-vite*' \
        -exec ls -la {} \; 2>/dev/null
      local temps
      temps="$(find "${cache}" -maxdepth 4 -type d -name 'deps_temp_*' 2>/dev/null | wc -l | tr -d ' ')"
      echo "deps_temp_* dirs in flight: ${temps}"
      find "${cache}" -maxdepth 4 -type d -name 'deps' -path '*sb-vite*' 2>/dev/null | while read -r dir; do
        echo "optimized deps in ${dir}: $(find "${dir}" -maxdepth 1 -name '*.js' 2>/dev/null | wc -l | tr -d ' ')"
      done
    else
      echo "no cache at ${cache}"
    fi
    echo

    echo "--- descriptors (watcher exhaustion) ---"
    # `lsof -p` also lists mapped regions and the executable, which inflated this count past the
    # limit and made every report look like exhaustion; only numeric FD rows are descriptors.
    echo "open descriptors: $(lsof -p "${pid}" 2>/dev/null | awk 'NR > 1 && $4 ~ /^[0-9]+/' | wc -l | tr -d ' ')"
    # macOS exposes no per-process rlimit for another process. This watcher is spawned by `serve.sh`
    # in the server's own shell, so its limit is the server's — but only when armed that way.
    echo "soft limit (inherited from the shell that armed this watcher): $(ulimit -n)"
    echo "the dev server watches with fs.watch: one descriptor per watched directory, ~12k here."
    echo

    echo "--- tab log stream ---"
    ls -la "${tree}/tools/storybook-react/app.log" 2>/dev/null || echo "no app.log"
    echo

    echo "--- where the CPU is going (the decisive section) ---"
    if command -v sample >/dev/null 2>&1; then
      sample "${pid}" 5 -file /dev/stdout 2>/dev/null
    else
      echo "\`sample\` unavailable (macOS only)."
    fi
  } >"${out}" 2>&1

  echo
  echo "Captured: ${out}"
  grep -E "^trigger:|^probe |^open descriptors:|^soft limit|deps_temp_\* dirs in flight:" "${out}"
  echo
  # chokidar 3's fsevents backend fans every raw event out over one listener per watched path and
  # rebuilds a path prefix in each, which pinned this server at 100% for minutes at a time. The
  # dev server is configured onto `fs.watch` instead (`.storybook/main.ts`), so this frame
  # reappearing means that configuration is not in effect for the process that hung.
  if grep -q "fse_dispatch_event" "${out}"; then
    echo "VERDICT: the fsevents watcher backend is live and burning the main thread —"
    echo "  \`useFsEvents: false\` in .storybook/main.ts is not reaching this server."
    echo
  fi
  echo "Main thread, deepest named frames (what the CPU is actually in):"
  # Counts are uniform down a single hot stack, so depth — not count — is the signal. The deepest
  # frames separate the candidates outright: GC thrash shows `Heap::CollectGarbage`, a watcher storm
  # shows fs/kqueue, a re-optimization shows esbuild, and plain JS shows the interpreter trampolines.
  # Unsymbolicated JIT frames (`???`) sit below all of them and name nothing.
  local frames
  frames="$(awk '/main-thread/{f=1; next} f && /Thread_/{exit} f && /^Binary Images:/{exit} f' "${out}" \
    | sed 's/(in [^)]*)//g; s/\[0x[0-9a-f]*\]//g; s/^[ +!:|]*//; s/ *$//' \
    | grep -E "^[0-9]+ [A-Za-z]" | grep -v "???" | tail -8)"
  if [ -n "${frames}" ]; then
    echo "${frames}" | sed 's/^/  /'
  else
    echo "  (none — the main thread was parked in the event loop, i.e. not spinning)"
  fi
  echo
  echo "Now restart the server. Send this file to whoever is fixing the hang."
}

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

# A status row is one tab-delimited line, and its worktree and capture fields are paths this
# script did not choose; a control character in one would split the row and reach the agent's
# context as a line of its own.
sanitize_field() { printf '%s' "$1" | tr -c '[:print:]' '?'; }

# One pass over every known port; rewrites the status file atomically at the end.
cycle() {
  mkdir -p "$WATCH_DIR"
  local tmp rows='' seen='' port pid kind tree age state reason cpu hot captured previous etime last
  tmp=$(mktemp "$STATUS.XXXXXX") || return 1
  for port in $(known_ports); do
    pid=$(listener_pid "$port")
    if [ -z "$pid" ]; then
      wedge_clear "$port"
      previous=$(previous_pid "$port")
      if [ -n "$previous" ] && [ "$previous" != '-' ]; then state=gone; else state=unbound; fi
      rows="$rows$port	-	-	-	$state	-	$(sanitize_field "$(last_capture "$port")")
"
      continue
    fi
    seen="$seen $pid"
    kind=$(pid_kind "$pid")
    tree=$(sanitize_field "$(pid_tree "$pid")")
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
      captured=$(capture "$port" "$pid" "$reason" "$tree" "$kind" | sed -n 's/^Captured: //p')
      [ -n "$captured" ] && last_set "$port" "$captured"
      wedge_set "$port" "${captured:-pending}"
      hot_set "$pid" 0
      state=wedged
    fi
    # Every field is placeheld, never empty: the reader drops short rows to defend against a
    # split one, and a server whose process vanished mid-cycle must not look like one.
    etime=$(pid_etime "$pid")
    last=$(sanitize_field "$(last_capture "$port")")
    rows="$rows$port	$pid	$kind	${tree:--}	$state	${etime:--}	${last:--}
"
  done
  hot_prune $seen
  printf '%s' "$rows" > "$tmp" && mv -f "$tmp" "$STATUS"
}

# A live pid is not identity: after a reboot or pid recycling the pidfile names an unrelated
# process, which `--restart` would otherwise SIGTERM.
watcher_alive() {
  local pid
  pid=$(cat "$PIDFILE" 2>/dev/null) || return 1
  [ -n "$pid" ] || return 1
  kill -0 "$pid" 2>/dev/null || return 1
  ps -o command= -p "$pid" 2>/dev/null | grep -q 'diagnose\.sh .*--watch'
}

# A per-port watcher from an older checkout duplicates every capture. The pattern cannot match
# the singleton, whose command line never carries --port.
LEGACY_PATTERN='diagnose\.sh --watch --port'
legacy_watcher() { pgrep -f "$LEGACY_PATTERN" >/dev/null 2>&1; }
reap_legacy() {
  local pattern="$LEGACY_PATTERN" legacy cmdline
  [ -n "${1:-}" ] && pattern="$pattern $1"
  for legacy in $(pgrep -f "$pattern" 2>/dev/null); do
    # Command line read before the kill, since a signalled pid can vanish before this loop reads it again.
    cmdline=$(ps -o command= -p "$legacy" 2>/dev/null)
    if kill "$legacy" 2>/dev/null; then
      echo "reaped legacy watcher pid $legacy ($cmdline)"
    fi
  done
  return 0
}

print_status() {
  if ! watcher_alive; then
    # Starting the singleton while a legacy watcher runs would leave two on :9009, so the
    # advice is to replace it rather than to add one.
    if legacy_watcher; then
      echo "unwatched — a per-port watcher from an older checkout is running; run bash tools/storybook-react/diagnose.sh --restart"
    else
      echo "unwatched — run bash tools/storybook-react/diagnose.sh --ensure"
    fi
    return 0
  fi
  printf 'port\tpid\tkind\tworktree\tstate\tage\tlast-capture\n'
  cat "$STATUS" 2>/dev/null
  # Three missed cycles means the loop is stuck even though its pid is alive.
  local written now
  written=$(stat -f %m "$STATUS" 2>/dev/null || stat -c %Y "$STATUS" 2>/dev/null || echo 0)
  now=$(date +%s)
  if [ "$written" -eq 0 ]; then
    echo "no status yet — the watcher has not finished its first cycle"
  elif [ $((now - written)) -gt $((INTERVAL * 3)) ]; then
    echo "stale: status last written $((now - written))s ago; run --restart"
  fi
}

ensure() {
  mkdir -p "$WATCH_DIR"
  # `mkdir` is atomic, so two `serve` tasks racing cannot both spawn; a lock older than a minute
  # outlived whatever held it.
  if [ -d "$LOCK" ] && [ -z "$(find "$LOCK" -maxdepth 0 -mmin +1 2>/dev/null)" ]; then
    echo "another --ensure is starting the watcher."; return 0
  fi
  rmdir "$LOCK" 2>/dev/null || true
  mkdir "$LOCK" 2>/dev/null || { echo "another --ensure is starting the watcher."; return 0; }
  trap 'rmdir "$LOCK" 2>/dev/null || true' EXIT
  # Before the singleton exists, so an older checkout's per-port watcher cannot end up
  # polling and capturing the same port alongside it.
  reap_legacy "${DX_REAP_MATCH:-}"
  if watcher_alive; then
    echo "dev-server watcher already running (pid $(cat "$PIDFILE"))."; return 0
  fi
  nohup bash "${BASH_SOURCE[0]}" --watch --interval "$INTERVAL" --timeout "$TIMEOUT" >>"$WATCH_LOG" 2>&1 &
  disown 2>/dev/null || true
  # The lock is held until the child owns the pidfile, because releasing it at spawn time lets
  # a second --ensure see no watcher and spawn a duplicate. 10s stays under the 60s stale-lock
  # threshold, so a failed start cannot wedge the next caller either.
  local waited=0
  while [ "$waited" -lt 50 ]; do
    watcher_alive && break
    sleep 0.2
    waited=$((waited + 1))
  done
  if ! watcher_alive; then
    echo "WARNING: watcher did not start within 10s (see $WATCH_LOG)" >&2
    return 1
  fi
  echo "dev-server watcher started (log: $WATCH_LOG, status: $STATUS)."
}

stop_watcher() {
  local pid
  # Only a pid that still looks like a watcher is signalled; a recycled one is simply a stale file.
  if watcher_alive; then
    pid=$(cat "$PIDFILE" 2>/dev/null)
    kill "$pid" 2>/dev/null
  fi
  rm -f "$PIDFILE"
  reap_legacy
}

case "$MODE" in
  ports) known_ports ;;
  etime) etime_seconds "$ETIME" ;;
  sanitize) sanitize_field "$SANITIZE"; echo ;;
  status) print_status ;;
  once) cycle ;;
  reap) reap_legacy "$REAP_MATCH" ;;
  ensure) ensure ;;
  restart) stop_watcher; sleep 1; ensure ;;
  capture)
    pid=$(listener_pid "$PORT")
    [ -n "$pid" ] || { echo "Nothing listening on :$PORT."; exit 1; }
    capture "$PORT" "$pid" manual "$(pid_tree "$pid")" "$(pid_kind "$pid")"
    ;;
  watch)
    mkdir -p "$WATCH_DIR"
    # A second watcher doubles every capture and, on exit, would delete the singleton's pidfile.
    if watcher_alive; then
      echo "dev-server watcher already running (pid $(cat "$PIDFILE"))."
      exit 0
    fi
    printf '%s' "$$" > "$PIDFILE"
    # Re-checked after the write: a watcher spawned at the same moment may have claimed the
    # pidfile since, and the loser yields rather than polling every port in parallel.
    owner=$(cat "$PIDFILE" 2>/dev/null)
    if [ "$owner" != "$$" ] && watcher_alive; then
      echo "dev-server watcher already running (pid $owner)."
      exit 0
    fi
    # Guarded because a watcher that lost the pidfile to a successor must not delete the successor's.
    trap 'if [ "$(cat "$PIDFILE" 2>/dev/null)" = "$$" ]; then rm -f "$PIDFILE"; fi' EXIT
    echo "$(date +%H:%M:%S) watching $(known_ports | tr '\n' ' ')every ${INTERVAL}s."
    while true; do
      cycle
      sleep "$INTERVAL"
    done
    ;;
esac
