#!/usr/bin/env bash
# Runs committed autocue flows and cuts showcase segments from each into <work>/clips (run from the work dir).
set -uo pipefail
SCRIPTS=$(cd "$(dirname "$0")" && pwd)
ROOT=$(git -C "$(dirname "$0")" rev-parse --show-toplevel)
P=$ROOT/packages/plugins
take() {
  local flow=$1 out=$2
  echo "== $out"
  "$SCRIPTS/run.sh" "$P/$flow" "$PWD/$out" 7339 | grep -E "ERR|error|driver exited" || true
}
take plugin-sheet/autocue/budget.mjs c-budget
"$SCRIPTS/cutstep.sh" c-budget clips "Total each quarter" sheet-budget 0.5
take plugin-table/autocue/reading-list.mjs c-table
"$SCRIPTS/cutstep.sh" c-table clips "Add a typed number column" table-column 0.5
take plugin-markdown/autocue/write-and-link.mjs c-markdown
"$SCRIPTS/cutstep.sh" c-markdown clips "Write in markdown" markdown-write 0.5
"$SCRIPTS/cutstep.sh" c-markdown clips "Write in markdown" tour-markdown 2 10
"$SCRIPTS/cutstep.sh" c-markdown clips "Open the linked page" markdown-checklist 1
take plugin-canvas/autocue/draw-and-nest.mjs c-canvas
"$SCRIPTS/cutstep.sh" c-canvas clips "Draw and label shapes" canvas-shapes 0.5
"$SCRIPTS/cutstep.sh" c-canvas clips "Draw and label shapes" tour-canvas 0 10
"$SCRIPTS/cutstep.sh" c-canvas clips "Open the frame" canvas-nest 0.5
take plugin-canvas/autocue/composer-uml.mjs c-uml
"$SCRIPTS/cutstep.sh" c-uml clips "Draw the top level" uml-top 1
"$SCRIPTS/cutstep.sh" c-uml clips "Go up and show both" uml-nested 0
take plugin-projects/autocue/plan-a-project.mjs c-project
"$SCRIPTS/cutstep.sh" c-project clips "Break the work into tasks" project-tasks 0.5
"$SCRIPTS/cutstep.sh" c-project clips "Break the work into tasks" tour-projects 0 10
