#!/usr/bin/env bash
# Opens Composer in a Chrome app window for Screen Studio: no address bar, tabs or bookmarks bar, a clean profile, and
# a page area of exactly the given size in CSS pixels. The title bar sits above the page, so the window is taller.
# usage: chrome.sh [url] [width height] (defaults http://localhost:5173, 1920 1080). 1920x1080 needs a display at least
# 1920 points wide (an external monitor); on a laptop use 1280 720: Screen Studio captures Retina at 2x (2560x1440),
# which scales cleanly to 1080p.
set -euo pipefail
URL=${1:-http://localhost:5173}
WIDTH=${2:-1920}
HEIGHT=${3:-1080}
PROFILE=${TMPDIR:-/tmp}/showcase-chrome
TITLE_BAR=${TITLE_BAR:-28}
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --user-data-dir="$PROFILE" \
  --app="$URL" \
  --window-position=0,0 \
  --window-size=$WIDTH,$((HEIGHT + TITLE_BAR)) \
  --hide-scrollbars \
  --no-first-run \
  --no-default-browser-check \
  --disable-features=Translate,AutofillServerCommunication \
  >/dev/null 2>&1 &
echo "Composer at $URL in a ${WIDTH}x${HEIGHT} app window (profile $PROFILE)."
echo "Check the size in DevTools (View > Developer > JavaScript Console): innerWidth + 'x' + innerHeight"
echo "should print ${WIDTH}x${HEIGHT}; if the height is off, re-run with TITLE_BAR set to the difference added or removed."
