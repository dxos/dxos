#!/usr/bin/env bash
# Cuts every `clip: <name>` step of a take into <clips>/<name>.mp4 (5s, the whole app frame, navtree included, at 1920x1080) and tiles a
# mid-clip frame of each into <take>/sheet.png.
# usage: cut.sh <take-dir> <clips-dir>
set -euo pipefail
TAKE=$1
CLIPS=$2
mkdir -p "$CLIPS" "$TAKE/frames"
rm -f "$TAKE"/frames/*.png
python3 - "$TAKE/timeline.json" "$TAKE/driver.log" > "$TAKE/clips.txt" <<'EOF'
import json, re, sys
log = open(sys.argv[2]).read()
failed = set(re.findall(r'FAILED (?:clip |setup: )([^\s:]+)', log))
for step in json.load(open(sys.argv[1]))['steps']:
    if step['text'].startswith('clip: '):
        name = step['text'][6:]
        if name in failed:
            print(f'skipping {name}', file=sys.stderr)
            continue
        print(step['ms'] / 1000, name.replace(' ', '-'))
EOF
i=0
while read -r start name; do
  i=$((i + 1))
  ffmpeg -nostdin -hide_banner -loglevel error -y -i "$TAKE/session.webm" -ss "$start" -t 5 \
    -vf "fps=60,scale=1920:1080:flags=lanczos" -c:v libx264 -preset veryfast -g 60 -crf 20 \
    -pix_fmt yuv420p -an "$CLIPS/$name.mp4"
  ffmpeg -nostdin -loglevel error -y -ss 3 -i "$CLIPS/$name.mp4" -frames:v 1 -vf "scale=480:270" \
    "$TAKE/frames/$(printf %02d $i).png"
  echo "$name $(ffprobe -v error -show_entries format=duration -of csv=p=0 "$CLIPS/$name.mp4")"
done < "$TAKE/clips.txt"
ffmpeg -nostdin -loglevel error -y -framerate 1 -i "$TAKE/frames/%02d.png" -vf "tile=4x$(((i + 3) / 4))" \
  -frames:v 1 "$TAKE/sheet.png"
