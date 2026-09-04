#!/usr/bin/env bash
#
# Copyright 2026 DXOS.org
#
# Capture why the storybook dev server is wedged, BEFORE restarting it — a restart destroys the only
# evidence, which is why this has stayed unexplained across sessions.
#
#   bash tools/storybook-react/diagnose.sh              # capture now
#   bash tools/storybook-react/diagnose.sh --watch      # capture by itself, the moment it wedges
#   bash tools/storybook-react/diagnose.sh --ensure     # start a watcher in the background if none runs
#
# `--watch` exists because the hang arrives when you are mid-flow and want to restart, not to run a
# script: it polls until the server stops answering (or pegs a core), then captures. `--ensure` is
# what the serve task calls, so the watcher is simply always there rather than something to remember.
#
# Options: --port N (9009) --interval N (15s, watch poll) --timeout N (10s, "answered" deadline)
#          --wait N (600s, how long to wait for the port before giving up — the serve task starts
#          this alongside the server, so the port is not bound yet)

set -uo pipefail

PORT=9009
INTERVAL=15
TIMEOUT=10
WAIT=600
WATCH=0
ENSURE=0

# `set -u` would abort on a bare `$2`, losing the exit-2 path below; and an unvalidated value lets
# `--port --watch` silently consume the next flag as the port.
number_arg() {
  case "${2-}" in
    '' | *[!0-9]*) echo "$1 needs a number" >&2; exit 2 ;;
  esac
  # Zero is not merely small here: `curl -m 0` disables the deadline entirely, so a wedged server
  # would never be detected, and a zero interval spins. Only `--wait 0` (do not wait) is meaningful.
  if [ "$2" -eq 0 ] && [ "$1" != '--wait' ]; then
    echo "$1 must be greater than zero" >&2
    exit 2
  fi
  echo "$2"
}

while [ $# -gt 0 ]; do
  case "$1" in
    --watch) WATCH=1 ;;
    --ensure) ENSURE=1 ;;
    --port) PORT="$(number_arg "$1" "${2-}")"; shift ;;
    --interval) INTERVAL="$(number_arg "$1" "${2-}")"; shift ;;
    --timeout) TIMEOUT="$(number_arg "$1" "${2-}")"; shift ;;
    --wait) WAIT="$(number_arg "$1" "${2-}")"; shift ;;
    -h|--help) sed -n '4,18p' "${BASH_SOURCE[0]}"; exit 0 ;;
    *) echo "unknown option: $1" >&2; exit 2 ;;
  esac
  shift
done

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OUT_DIR="${ROOT}/temp"
CACHE="${ROOT}/tools/storybook-react/node_modules/.cache/storybook"

server_pid() {
  lsof -ti ":${PORT}" -sTCP:LISTEN 2>/dev/null | head -1
}

# Total CPU% across the process's threads; a wedged server sits at ~100 on one core.
cpu_of() {
  ps -o %cpu= -p "$1" 2>/dev/null | tr -d ' '
}

capture() {
  local pid="$1" reason="$2"
  mkdir -p "${OUT_DIR}" || { echo "cannot write to ${OUT_DIR}" >&2; return 1; }
  # `mktemp`, not a timestamp: two captures in the same second (a second watcher, or a manual run
  # racing the automatic one) would otherwise share a path and truncate each other's report.
  local out
  out="$(mktemp "${OUT_DIR}/storybook-diagnosis-$(date +%Y%m%d-%H%M%S)-XXXXXX")" || {
    echo "cannot allocate a report file in ${OUT_DIR}" >&2
    return 1
  }

  {
    echo "=== storybook :${PORT} pid ${pid} @ $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="
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
    curl -sf -m "${TIMEOUT}" -o /dev/null -w "index.json: HTTP %{http_code} in %{time_total}s\n" \
      "http://localhost:${PORT}/index.json" || echo "index.json: NO RESPONSE within ${TIMEOUT}s"
    echo

    echo "--- vite dep optimizer ---"
    echo "The leading hypothesis is a re-optimization storm: serving all of @dxos/** from source means"
    echo "each new story can discover new deps, forcing a re-bundle and a reload that discovers more."
    echo "A 'deps_temp_*' directory exists ONLY while a re-optimization is in flight, so finding one"
    echo "here confirms it; a '_metadata.json' written seconds ago says the same."
    if [ -d "${CACHE}" ]; then
      # Its mtime is when the optimizer last rewrote the bundle; seconds ago means a storm.
      find "${CACHE}" -maxdepth 5 -name '_metadata.json' -path '*sb-vite*' \
        -exec ls -la {} \; 2>/dev/null
      local temps
      temps="$(find "${CACHE}" -maxdepth 4 -type d -name 'deps_temp_*' 2>/dev/null | wc -l | tr -d ' ')"
      echo "deps_temp_* dirs in flight: ${temps}"
      find "${CACHE}" -maxdepth 4 -type d -name 'deps' -path '*sb-vite*' 2>/dev/null | while read -r dir; do
        echo "optimized deps in ${dir}: $(find "${dir}" -maxdepth 1 -name '*.js' 2>/dev/null | wc -l | tr -d ' ')"
      done
    else
      echo "no cache at ${CACHE}"
    fi
    echo

    echo "--- descriptors (watcher exhaustion) ---"
    echo "count: $(lsof -p "${pid}" 2>/dev/null | wc -l | tr -d ' ')  limit: $(ulimit -n)"
    echo

    echo "--- tab log stream ---"
    ls -la "${ROOT}/tools/storybook-react/app.log" 2>/dev/null || echo "no app.log"
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
  grep -E "^trigger:|index.json:|^count:|deps_temp_\* dirs in flight:" "${out}"
  echo
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

# Already-running watcher for this port. Matching on the port keeps one watcher per server rather
# than per worktree, which is what the serve task needs — several servers may run at once.
watcher_pid() {
  pgrep -f "diagnose\.sh .*--watch" 2>/dev/null | while read -r candidate; do
    if ps -o command= -p "${candidate}" 2>/dev/null | grep -q -- "--port ${PORT}\b"; then
      echo "${candidate}"
      return
    fi
  done
}

if [ "${ENSURE}" -eq 1 ]; then
  mkdir -p "${OUT_DIR}"
  # `mkdir` is atomic, so it serializes the check-then-spawn below: two `serve` invocations racing
  # for one port would otherwise both find nothing and both spawn. A lock older than a minute
  # outlived whatever held it — no spawn takes that long.
  lock="${OUT_DIR}/.watcher-${PORT}.lock"
  if [ -d "${lock}" ] && [ -z "$(find "${lock}" -maxdepth 0 -mmin +1 2>/dev/null)" ]; then
    echo "another --ensure is starting a watcher for :${PORT}."
    exit 0
  fi
  rmdir "${lock}" 2>/dev/null || true
  if ! mkdir "${lock}" 2>/dev/null; then
    echo "another --ensure is starting a watcher for :${PORT}."
    exit 0
  fi
  trap 'rmdir "${lock}" 2>/dev/null || true' EXIT

  existing="$(watcher_pid | head -1)"
  if [ -n "${existing}" ]; then
    echo "storybook hang watcher already running for :${PORT} (pid ${existing})."
    exit 0
  fi
  mkdir -p "${OUT_DIR}"
  log="${OUT_DIR}/storybook-watcher-${PORT}.log"
  # Detached, so it outlives the task that started it and keeps watching for the server's whole life.
  nohup bash "${BASH_SOURCE[0]}" --watch --port "${PORT}" --interval "${INTERVAL}" \
    --timeout "${TIMEOUT}" --wait "${WAIT}" >>"${log}" 2>&1 &
  disown 2>/dev/null || true
  echo "storybook hang watcher started for :${PORT} (log: ${log})."
  exit 0
fi

PID="$(server_pid)"

if [ "${WATCH}" -eq 0 ]; then
  if [ -z "${PID}" ]; then
    echo "Nothing listening on :${PORT}."
    exit 1
  fi
  capture "${PID}" "manual"
  exit 0
fi

# Started alongside the server by the serve task, so the port is not bound yet; a storybook boot on
# this repo is minutes, not seconds.
waited=0
while [ -z "${PID}" ] && [ "${waited}" -lt "${WAIT}" ]; do
  sleep "${INTERVAL}"
  waited=$((waited + INTERVAL))
  PID="$(server_pid)"
done
if [ -z "${PID}" ]; then
  echo "Nothing came up on :${PORT} within ${WAIT}s; giving up."
  exit 1
fi

echo "$(date +%H:%M:%S) watching :${PORT} (pid ${PID}) every ${INTERVAL}s."
hot=0
watched="${PID}"
while true; do
  sleep "${INTERVAL}"

  PID="$(server_pid)"
  if [ -z "${PID}" ]; then
    echo "$(date +%H:%M:%S) server on :${PORT} is gone (stopped or restarted) — waiting for it to return."
    waited=0
    while [ -z "${PID}" ] && [ "${waited}" -lt "${WAIT}" ]; do
      sleep "${INTERVAL}"
      waited=$((waited + INTERVAL))
      PID="$(server_pid)"
    done
    [ -z "${PID}" ] && { echo "gave up after ${WAIT}s."; exit 1; }
    hot=0
    continue
  fi

  # A restart puts a different process on the port; its predecessor's hot polls must not count
  # toward this one's threshold.
  if [ "${PID}" != "${watched:-}" ]; then
    watched="${PID}"
    hot=0
  fi

  reason=""
  if ! curl -sf -m "${TIMEOUT}" -o /dev/null "http://localhost:${PORT}/index.json"; then
    reason="no response within ${TIMEOUT}s"
  else
    # Answering while pegged is the more common shape: the module graph still serves, but the
    # optimizer or the watcher is burning a core, so every navigation crawls. Three in a row rules
    # out a build.
    cpu="$(cpu_of "${PID}")"
    if [ -n "${cpu}" ] && [ "${cpu%%.*}" -ge 90 ]; then
      hot=$((hot + 1))
      echo "$(date +%H:%M:%S) cpu ${cpu}% (${hot}/3)"
      [ "${hot}" -ge 3 ] && reason="cpu ${cpu}% sustained over 3 polls"
    else
      hot=0
    fi
  fi

  if [ -n "${reason}" ]; then
    capture "${PID}" "${reason}"
    hot=0
    # Re-arm rather than exit: nobody is babysitting an auto-started watcher, and the hang recurs.
    # Waiting for the server to answer again first keeps one wedge from producing a run of reports.
    echo "$(date +%H:%M:%S) waiting for :${PORT} to answer again before re-arming."
    until curl -sf -m "${TIMEOUT}" -o /dev/null "http://localhost:${PORT}/index.json"; do
      sleep "${INTERVAL}"
      [ -z "$(server_pid)" ] && break
    done
    echo "$(date +%H:%M:%S) re-armed."
  fi
done
