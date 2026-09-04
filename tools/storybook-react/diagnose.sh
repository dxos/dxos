#!/usr/bin/env bash
#
# Copyright 2026 DXOS.org
#
# Capture why the storybook dev server is wedged, BEFORE restarting it — a restart destroys the
# only evidence, which is why this has stayed unexplained across sessions.
#
#   bash tools/storybook-react/diagnose.sh [port]
#
# Writes a report to temp/storybook-diagnosis-<timestamp>.txt and prints the summary.

set -uo pipefail

PORT="${1:-9009}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OUT_DIR="${ROOT}/temp"
mkdir -p "${OUT_DIR}"
OUT="${OUT_DIR}/storybook-diagnosis-$(date +%Y%m%d-%H%M%S).txt"

PID="$(lsof -ti ":${PORT}" -sTCP:LISTEN 2>/dev/null | head -1)"
if [ -z "${PID}" ]; then
  echo "Nothing listening on :${PORT}."
  exit 1
fi

{
  echo "=== storybook :${PORT} pid ${PID} @ $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="
  echo
  echo "--- process ---"
  ps -o pid,ppid,%cpu,%mem,rss,etime,time,state,command -p "${PID}"
  echo
  echo "--- every storybook/vite process (orphans from earlier runs keep a monorepo-wide watcher"
  echo "    and ~2GB each, so they starve the live one) ---"
  ps ax -o pid,ppid,%cpu,rss,etime,command | grep -Ei "storybook|vite dev" | grep -v grep
  echo
  echo "--- open file descriptors (watcher exhaustion shows up here) ---"
  echo "count: $(lsof -p "${PID}" 2>/dev/null | wc -l | tr -d ' ')"
  echo "limit: $(ulimit -n)"
  echo
  echo "--- responsive? (a wedged server accepts the socket but never answers) ---"
  curl -sf -m 5 -o /dev/null -w "index.json: HTTP %{http_code} in %{time_total}s\n" \
    "http://localhost:${PORT}/index.json" || echo "index.json: NO RESPONSE within 5s"
  echo
  echo "--- where the CPU is going (the decisive one: names the spinning stack) ---"
  if command -v sample >/dev/null 2>&1; then
    sample "${PID}" 5 -file /dev/stdout 2>/dev/null | sed -n '1,120p'
  else
    echo "\`sample\` unavailable (macOS only)."
  fi
  echo
  echo "--- tab log stream (this file is appended to by every open story tab) ---"
  ls -la "${ROOT}/tools/storybook-react/app.log" 2>/dev/null || echo "no app.log"
} >"${OUT}" 2>&1

echo "Wrote ${OUT}"
echo
grep -E "index.json:|^count:|^limit:" "${OUT}"
echo
echo "Storybook/vite processes found:"
grep -cE "storybook dev|vite dev" "${OUT}" || true
