#!/usr/bin/env bash
# Cuts <seconds> (default 5) from the start of a named step of a take, plus an optional offset, into <clips>/<name>.mp4.
# usage: cutstep.sh <take-dir> <clips-dir> <step-name-prefix> <clip-name> [offset] [seconds]
set -euo pipefail
TAKE=$1
CLIPS=$2
STEP=$3
NAME=$4
OFFSET=${5:-0}
SECONDS_=${6:-5}
mkdir -p "$CLIPS"
START=$(python3 - "$TAKE/timeline.json" "$STEP" "$OFFSET" <<'EOF'
import json, sys
steps = json.load(open(sys.argv[1]))['steps']
match = next(step for step in steps if step['text'].startswith(sys.argv[2]))
print(match['ms'] / 1000 + float(sys.argv[3]))
EOF
)
ffmpeg -nostdin -hide_banner -loglevel error -y -i "$TAKE/session.webm" -ss "$START" -t "$SECONDS_" \
  -vf "fps=60,scale=960:540" -c:v libx264 -preset veryfast -g 60 -crf 22 \
  -pix_fmt yuv420p -an "$CLIPS/$NAME.mp4"
echo "$NAME $START $(ffprobe -v error -show_entries format=duration -of csv=p=0 "$CLIPS/$NAME.mp4")"
