#!/usr/bin/env bash
#
# Copyright 2026 DXOS.org
#
# Capture why the storybook dev server is wedged, BEFORE restarting it — a restart destroys the only
# evidence, which is why this has stayed unexplained across sessions.
#
#   bash tools/storybook-react/diagnose.sh              # capture now
#   bash tools/storybook-react/diagnose.sh --watch      # capture by itself, the moment it wedges
#
# `--watch` exists because the hang arrives when you are mid-flow and want to restart, not to run a
# script: it polls until the server stops answering (or pegs a core), captures, and exits.
#
# Options: --port N (9009) --interval N (15s, watch poll) --timeout N (10s, "answered" deadline)

set -uo pipefail

PORT=9009
INTERVAL=15
TIMEOUT=10
WATCH=0

while [ $# -gt 0 ]; do
  case "$1" in
    --watch) WATCH=1 ;;
    --port) PORT="$2"; shift ;;
    --interval) INTERVAL="$2"; shift ;;
    --timeout) TIMEOUT="$2"; shift ;;
    -h|--help) sed -n '4,16p' "${BASH_SOURCE[0]}"; exit 0 ;;
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
  mkdir -p "${OUT_DIR}"
  local out="${OUT_DIR}/storybook-diagnosis-$(date +%Y%m%d-%H%M%S).txt"

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

PID="$(server_pid)"
if [ -z "${PID}" ]; then
  echo "Nothing listening on :${PORT}."
  exit 1
fi

if [ "${WATCH}" -eq 0 ]; then
  capture "${PID}" "manual"
  exit 0
fi

echo "Watching :${PORT} (pid ${PID}) every ${INTERVAL}s — captures and exits the moment it wedges."
echo "Leave this running; Ctrl-C to stop."
hot=0
while true; do
  sleep "${INTERVAL}"

  PID="$(server_pid)"
  if [ -z "${PID}" ]; then
    echo "Server on :${PORT} is gone (stopped or crashed) — nothing to capture."
    exit 1
  fi

  if ! curl -sf -m "${TIMEOUT}" -o /dev/null "http://localhost:${PORT}/index.json"; then
    capture "${PID}" "no response within ${TIMEOUT}s"
    exit 0
  fi

  # Answering while pegged is the more common shape: the module graph still serves, but the optimizer
  # or the watcher is burning a core, so every navigation crawls. Three in a row rules out a build.
  cpu="$(cpu_of "${PID}")"
  if [ -n "${cpu}" ] && [ "${cpu%%.*}" -ge 90 ]; then
    hot=$((hot + 1))
    echo "$(date +%H:%M:%S) cpu ${cpu}% (${hot}/3)"
    if [ "${hot}" -ge 3 ]; then
      capture "${PID}" "cpu ${cpu}% sustained over 3 polls"
      exit 0
    fi
  else
    hot=0
  fi
done
