#!/bin/bash
#
# Dead-simple morning-record flow.
#
#   ./tools/demo/morning.sh
#
# What it does:
#   1. Makes sure vite is up and the Composer page loads cleanly.
#   2. Starts a macOS screencapture in the background.
#   3. Runs `pnpm demo` to bootstrap + lay out windows.
#   4. Prints a big banner with the v2 script so you know what to walk through.
#   5. When you close Chromium, stops the recording and tells you the file.
#

set -e
cd "$(dirname "$0")"
REPO_ROOT="$(cd ../.. && pwd)"
RECORDINGS_DIR="$(pwd)/recordings"
mkdir -p "$RECORDINGS_DIR"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H-%M-%SZ")
RECORDING_FILE="$RECORDINGS_DIR/demo-$TIMESTAMP.mov"

# --- 1. Ensure vite is warm ---------------------------------------------------

VITE_UP=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5173 2>/dev/null || echo "000")
if [ "$VITE_UP" != "200" ]; then
  echo "▶ Vite not running. Starting it in the background (cold start ~2-3 min)…"
  ( cd "$REPO_ROOT" && node_modules/.bin/moon run composer-app:serve --quiet > /tmp/vite-morning.log 2>&1 & )
  # Wait for vite to respond.
  for _ in $(seq 1 180); do
    sleep 1
    VITE_UP=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5173 2>/dev/null || echo "000")
    if [ "$VITE_UP" = "200" ]; then
      break
    fi
  done
  if [ "$VITE_UP" != "200" ]; then
    echo "✗ Vite never came up. Check /tmp/vite-morning.log."
    exit 1
  fi
  # Give dep optimization one cycle to settle.
  echo "  waiting 30s for dep optimization to settle…"
  sleep 30
fi
echo "✓ Vite is live on http://localhost:5173"

# --- 2. Start screen recording ------------------------------------------------

echo "▶ Starting screen recording → $RECORDING_FILE"
screencapture -v -x "$RECORDING_FILE" &
RECORDER_PID=$!
trap 'echo; echo "⧉ stopping recording…"; kill -INT $RECORDER_PID 2>/dev/null || true; wait $RECORDER_PID 2>/dev/null || true; echo "✓ video saved to $RECORDING_FILE"' EXIT

# Give screencapture a beat to grab the permission prompt if needed.
sleep 2

# --- 3. Run the demo ---------------------------------------------------------

echo "▶ Running pnpm demo (bootstrap + window layout)…"
pnpm exec tsx demo.ts || {
  echo "✗ demo.ts failed. Recording stopped; check $RECORDING_FILE for what got captured."
  exit 1
}

# --- 4. Show the script banner -----------------------------------------------

cat <<'BANNER'

================================================================================
 🎬 RECORDING — walk through the v2 script
================================================================================

 Act 1  (0:00–0:20)  Terminal cold open — this window is perfect.
 Act 2  (0:20–1:10)  Phone-to-home: Slack DM → switch to Composer → continue.
 Act 3  (1:10–2:20)  Explain → Fail → Recover. Use the "Wrong card?" select.
 Act 4  (2:20–3:00)  Wi-Fi yank (watch OFFLINE banner). Pan to plugin source.

 Full script: plans/video-script-v2.md

 When you're done: close the Chromium window or Ctrl+C here.
================================================================================

BANNER

# --- 5. Hold until user closes --------------------------------------------

# The demo.ts script already enters holdOpen(), so by the time we reach here
# the user has either closed Chromium or hit Ctrl+C. The trap above will
# flush screencapture on exit.
