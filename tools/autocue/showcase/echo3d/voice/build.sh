#!/usr/bin/env bash
#
# Copyright 2026 DXOS.org
#

# Rebuilds a voiced echo3d video from the committed holds and the takes on R2; spends no ElevenLabs credits.
# Usage (from anywhere): tools/autocue/showcase/echo3d/voice/build.sh fry|pro|saas45 [work dir, default temp/voice]

set -euo pipefail

SET=${1:?usage: build.sh fry|pro|saas45 [work dir]}
HERE=$(cd "$(dirname "$0")" && pwd)
ROOT=$(git -C "$HERE" rev-parse --show-toplevel)
WORK=$(mkdir -p "${2:-$ROOT/temp/voice}" && cd "${2:-$ROOT/temp/voice}" && pwd)
PORT=7420

fetch_takes() {
  [ -d "$WORK/takes/fry" ] && return
  local url sha
  url=$(python3 -c "import json,sys; print(json.load(open(sys.argv[1]))['url'])" "$HERE/takes.json")
  sha=$(python3 -c "import json,sys; print(json.load(open(sys.argv[1]))['sha256'])" "$HERE/takes.json")
  curl -fsSL "$url" -o "$WORK/takes.tar.gz"
  echo "$sha  $WORK/takes.tar.gz" | shasum -a 256 -c -
  tar -xzf "$WORK/takes.tar.gz" -C "$WORK"
}

# record.mjs loads the slides from serve.py; start it unless something already answers on the port.
ensure_server() {
  curl -s -o /dev/null --connect-timeout 2 --max-time 5 "http://localhost:$PORT/" && return
  (cd "$HERE/.." && python3 serve.py "$PORT" > "$WORK/serve.log" 2>&1 &)
  until curl -s -o /dev/null --max-time 2 "http://localhost:$PORT/"; do sleep 1; done
}

# Silent 60fps render paced by the holds; about four minutes of frames, so it takes a while.
render() {
  local set=$1
  [ -f "$WORK/echo3d-$set-video.mp4" ] && return
  ensure_server
  (cd "$ROOT" && node tools/autocue/showcase/echo3d/record.mjs --holds "$HERE/holds-$set.json" \
    --out "$WORK/echo3d-$set-video.mp4")
}

# The picture holds its last frame a little past the voice so the end card is not cut off.
voiced() {
  local set=$1 pad=$2
  render "$set"
  python3 "$HERE/mix.py" "$WORK/takes/$set" "$HERE/holds-$set.json" "$WORK/echo3d-$set-video.mp4" \
    "$WORK/echo3d-$set.m4a"
  ffmpeg -y -v error -i "$WORK/echo3d-$set-video.mp4" -i "$WORK/echo3d-$set.m4a" -map 0:v -map 1:a \
    -vf "tpad=stop_mode=clone:stop_duration=$pad" -c:v libx264 -preset slow -crf 12 -tune grain -pix_fmt yuv420p \
    -c:a copy -shortest -movflags +faststart "$WORK/echo3d-$set-voiced.mp4"
  echo "$WORK/echo3d-$set-voiced.mp4"
}

fetch_takes
case "$SET" in
  fry) voiced fry 1.0 ;;
  pro) voiced pro 0.5 ;;
  saas45)
    render fry
    python3 "$HERE/cut45.py" "$WORK/echo3d-fry-video.mp4" "$WORK/takes/saas45" "$WORK/SAAS-45.mp4"
    echo "$WORK/SAAS-45.mp4"
    ;;
  *) echo "unknown set: $SET" >&2; exit 1 ;;
esac
