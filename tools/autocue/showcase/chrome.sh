#!/usr/bin/env bash
# Opens Composer in a Chrome app window for Screen Studio: no address bar, tabs or bookmarks bar, a clean profile, and
# a page area of exactly 1920x1080 CSS pixels. The title bar sits above the page, so the window is taller than 1080.
# usage: chrome.sh [url] (default http://localhost:5173); needs a display at least 1920 points wide (an external
# monitor at 1920x1080 "looks like" or larger; a laptop panel is too small).
set -euo pipefail
URL=${1:-http://localhost:5173}
PROFILE=${TMPDIR:-/tmp}/showcase-chrome
TITLE_BAR=${TITLE_BAR:-28}
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --user-data-dir="$PROFILE" \
  --app="$URL" \
  --window-position=0,0 \
  --window-size=1920,$((1080 + TITLE_BAR)) \
  --hide-scrollbars \
  --no-first-run \
  --no-default-browser-check \
  --disable-features=Translate,AutofillServerCommunication \
  >/dev/null 2>&1 &
echo "Composer at $URL in a 1920x1080 app window (profile $PROFILE)."
echo "Check the size in DevTools (View > Developer > JavaScript Console): innerWidth + 'x' + innerHeight"
echo "should print 1920x1080; if the height is off, re-run with TITLE_BAR set to the difference added or removed."
