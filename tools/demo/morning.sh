#!/bin/bash
#
# Dead-simple morning demo launcher.
#
#   pnpm record
#
# What it does:
#   1. Kills any stale vite/Chromium processes from yesterday.
#   2. Starts a fresh vite dev server and waits until the page actually
#      serves __DEMO__ (not just HTTP 200 — the full plugin bundle).
#   3. Runs pnpm demo to bootstrap and lay out windows.
#   4. Prints a big banner with the v2 script.
#
# Screen recording: macOS screencapture silently fails without explicit
# Screen Recording permission for the Terminal app. Rather than fight
# that every time, this script only drives the demo — YOU start the
# recording manually with Cmd-Shift-5 or QuickTime right before you
# begin narrating. Gives you a clean cut anyway.

set -e
cd "$(dirname "$0")"
REPO_ROOT="$(cd ../.. && pwd)"

# --- 1. Kill anything stale -------------------------------------------------

echo "▶ Cleaning up stale processes…"
pkill -9 -f "vite dev" 2>/dev/null || true
pkill -9 -f "Google Chrome for Testing" 2>/dev/null || true
pkill -9 -f "tsx demo.ts" 2>/dev/null || true
rm -rf ./playwright-user-data 2>/dev/null || true
sleep 1

# --- 2. Start fresh vite and wait for it to FULLY serve the app ------------

echo "▶ Starting vite (cold start ~2-3 min)…"
DEMO_DIR="$(pwd)"
mkdir -p "$DEMO_DIR/logs"
VITE_LOG="$DEMO_DIR/logs/vite-morning-$(date -u +%Y-%m-%dT%H-%M-%SZ).log"
( cd "$REPO_ROOT" && node_modules/.bin/moon run composer-app:serve --quiet > "$VITE_LOG" 2>&1 & )

# Wait for vite to serve the root HTML.
CODE="000"
for i in $(seq 1 240); do
  sleep 1
  CODE=$(curl -s --max-time 3 -o /dev/null -w "%{http_code}" http://localhost:5173 2>/dev/null || echo "000")
  if [ "$CODE" = "200" ]; then
    echo "  vite is responding on :5173 (after ${i}s)"
    break
  fi
  if [ $((i % 15)) -eq 0 ]; then
    echo "  still waiting (${i}s, last code=$CODE)…"
  fi
done
if [ "$CODE" != "200" ]; then
  echo "✗ vite never responded. Check $VITE_LOG"
  exit 1
fi

# Now wait for the app bundle to actually load __DEMO__. This catches the
# 504 "Outdated Optimize Dep" window where vite returns 200 but modules
# are incomplete.
echo "▶ Waiting for the app to fully load the demo bundle…"
if ! pnpm exec tsx "$DEMO_DIR/lib/wait-for-demo.ts"; then
  echo "✗ app bundle never produced __DEMO__. Check $VITE_LOG for errors."
  exit 1
fi

# --- 3. Show the pre-record banner -----------------------------------------

cat <<'BANNER'

================================================================================
 🎬 READY TO RECORD
================================================================================

 Vite is warm. Demo bundle is loaded.

 1. Start your screen recording NOW (Cmd-Shift-5 on macOS). Pick "record
    entire screen" and hit Record.
 2. Hit Return below to launch the demo. You'll get ~3 minutes.
 3. Walk through the v2 script:

      Act 1 (0:00-0:20) — click "Morning briefing" in the demo panel.
      Act 2 (0:20-1:10) — phone-to-home (Slack DM → Composer chat).
      Act 3 (1:10-2:20) — explain → fail → recover ("Wrong card?" select).
      Act 4 (2:20-3:00) — Wi-Fi yank, "Draft weekly update", plugin-linear pan.

 4. When done, close Chromium OR Ctrl+C here. Stop your screen recording.

 Full script: plans/video-script-v2.md
================================================================================

Press Return to launch demo…
BANNER

read -r

# --- 4. Run the demo -------------------------------------------------------

echo "▶ Launching demo…"
pnpm exec tsx demo.ts
