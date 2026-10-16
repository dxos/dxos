#!/usr/bin/env bash
# Re-records every showcase clip (light mode, 60 fps, no ident), lays out the grid, and records the composite.
set -uo pipefail
SCRIPTS=$(cd "$(dirname "$0")" && pwd)
ROOT=$(git -C "$(dirname "$0")" rev-parse --show-toplevel)
# Takes and clips go to the gitignored temp/ at the repo root; GridZoom reads the grid from temp/grid-zoom.
mkdir -p "$ROOT/temp/showcase" "$ROOT/temp/grid-zoom" && cd "$ROOT/temp/showcase"
until [ "$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 http://localhost:4173/)" = 200 ]; do sleep 5; done
echo "== composer up"

rm -rf clips
lsof -ti tcp:7337 -sTCP:LISTEN | xargs -r kill -9
BATCH=one,mermaid,two,three "$SCRIPTS/run.sh" "$SCRIPTS/flow.mjs" "$PWD/takeL" | grep -E "ERR|error|driver exited" || true
grep FAILED takeL/driver.log | cut -c1-160 || true
"$SCRIPTS/cut.sh" takeL clips | tr '\n' ' '
echo
lsof -ti tcp:7339 -sTCP:LISTEN | xargs -r kill -9
"$SCRIPTS/committed.sh"
echo "== clips: $(ls clips | wc -l)"

python3 - <<'EOF'
import shutil
clips = 'clips'
grid = '../grid-zoom'
tour = ['tour-markdown', 'tour-canvas', 'tour-projects']
for step, name in enumerate(tour):
    shutil.copy(f'{clips}/{name}.mp4', f'{grid}/tour-{step + 1}.mp4')
order = ['terra', 'map', 'chess', 'mermaid', 'presenter', 'tldraw', 'handpan', 'registry', 'project', 'uml-nested', 'sheet-budget',
         'excalidraw', 'spacetime', 'canvas-shapes', 'project-tasks', 'markdown-write', 'voxel', 'table-column',
         'canvas-nest', 'sheet', 'uml-top', 'explorer', 'markdown-checklist', 'canvas', 'markdown', 'outline',
         'journal']
import os
order = [name for name in order if os.path.exists(f'{clips}/{name}.mp4')]
for index in range(36):
    name = order[index % len(order)]
    shutil.copy(f'{clips}/{name}.mp4', f'{grid}/clip-{index:02d}.mp4')
print('grid laid out from', len(order), 'clips')
EOF
echo "== composite"
R=$ROOT/temp/composite
rm -rf "$R" && mkdir -p "$R"
lsof -ti tcp:7334 -sTCP:LISTEN | xargs -r kill -9
node "$ROOT/.agents/skills/autocue/scripts/driver.mjs" --port 7334 \
  --url "http://localhost:9015/iframe.html?id=ui-react-ui-canvas-gridzoom--default&viewMode=story&args=controls:!false&globals=theme:light" --out "$R" \
  --width 1920 --height 1080 --scale 1 --overlay off --gpu on --theme light --fps 60 --captions off --ready video --settle 0 \
  --ready-timeout 180000 > "$R/driver.log" 2>&1 &
until [ -f "$R/token" ]; do sleep 1; done
T=$(cat "$R/token")
C() { curl -sS -H "x-demo-token: $T" localhost:7334/cmd -d "$1"; echo; }
C '{"op":"goto"}' > /dev/null
C '{"op":"eval","hud":false,"expr":"(async()=>{for(let i=0;i<60;i++){const v=[...document.querySelectorAll(`video`)];if(v.length>=36&&v.every(x=>x.readyState>=3))return v.length;await new Promise(r=>setTimeout(r,500))}return 0})()"}'
C '{"op":"cut"}' > /dev/null
C '{"op":"eval","hud":false,"expr":"document.querySelector(`button[aria-label=Replay]`).click()"}' > /dev/null
C '{"op":"sleep","ms":47000}' > /dev/null
C '{"op":"stop"}' > /dev/null
ffmpeg -nostdin -hide_banner -loglevel error -y -i "$R/session.webm" -vf fps=60 -c:v libx264 -preset medium -crf 20 \
  -pix_fmt yuv420p -movflags +faststart "$R/composite.mp4"
echo "== done $(ffprobe -v error -show_entries stream=r_frame_rate:format=duration -of csv=p=0 "$R/composite.mp4" | tr '\n' ' ')"
