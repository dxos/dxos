#!/bin/bash

# Readies each `edge-release` plugin's EDGE bundle (`dist/plugin`) for its package tarball, ahead of the pkg.pr.new and
# npm publishes: `prepack-edge-release` checks the bundle and drops its source maps. A plugin whose check fails stops
# neither the others nor the publish; its package ships no bundle.

set -euo pipefail

if ! moon exec --on-failure continue '#edge-release:prepack-edge-release'; then
  # A bundle whose check failed keeps its maps, since `prepack-edge-release` did not run; it ships none.
  for bundle in packages/plugins/*/dist/plugin; do
    if [ -n "$(find "$bundle" -name '*.map' -print -quit)" ]; then
      rm -rf "$bundle"
      echo "::warning::$bundle failed check-edge-release; its package publishes without an EDGE bundle."
    fi
  done
fi
