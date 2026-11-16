#!/bin/bash

# Builds the EDGE plugin bundle (`dist/plugin`) of every package tagged `edge-release`, so the published tarballs carry
# it: dxos/edge seeds its plugin registry from `node_modules/@dxos/<plugin>/dist/plugin` instead of building dxos.
# Run after `moon run :build`. No `exports` entry names `dist/plugin`, so importers of these packages see no change.

set -euo pipefail

# A failed check still leaves the bundle it wrote, and EDGE's registry refuses a bundle that does not describe, so one
# plugin's failure stops neither the others nor the publish. `Check` already gates `main` on the same task.
if ! moon exec --on-failure continue '#edge-release:check-edge-release'; then
  echo '::warning::An EDGE plugin bundle check failed; that package publishes the bundle as built.'
fi

# Source maps are two thirds of a bundle and EDGE never reads them. Only these packages' `dist/plugin`: others (ui-theme,
# config) use the same directory name for unrelated output.
moon query projects 'tag=edge-release' |
  node -e "
    const { projects } = JSON.parse(require('fs').readFileSync(0, 'utf-8'));
    console.log(projects.map((project) => project.source).join('\n'));
  " |
  while read -r directory; do
    if [ -d "$directory/dist/plugin" ]; then
      find "$directory/dist/plugin" -name '*.map' -type f -delete
      echo "$directory/dist/plugin: $(du -sh "$directory/dist/plugin" | cut -f1)"
    else
      echo "::warning::$directory has no dist/plugin; its package publishes without an EDGE bundle."
    fi
  done
