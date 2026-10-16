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
# Rendered frame by frame from the stepped story: a live screencast manages about 25 fps at 1080p.
mkdir -p "$ROOT/temp/composite"
node "$SCRIPTS/render.mjs" --out "$ROOT/temp/composite/composite.mp4" --fps 60 --theme light
