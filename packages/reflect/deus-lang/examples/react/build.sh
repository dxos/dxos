#!/usr/bin/env bash
# Builds the DEUS React example (examples/react/todo.deus) into a static page in $1 (default
# examples/react/out): `deus build --js` compiles the app to an ES module, esbuild bundles it with
# React. Serve the folder with any static server.
set -euo pipefail
here=$(cd "$(dirname "$0")" && pwd)
pkg=$(cd "$here/../.." && pwd)
out=${1:-$here/out}
deus() { node "$pkg/bin/deus.mjs" "$@"; }
export DEUS_CODEBASE=${DEUS_CODEBASE:-$(mktemp -d)/codebase}
[ -d "$DEUS_CODEBASE" ] || deus init > /dev/null
deus add "$pkg/platform/js/js.deus" "$pkg/platform/js/react.deus" "$here/todo.deus" > /dev/null
mkdir -p "$out/build"
deus build TodoApp.main -o "$out/build/app.js" --js
printf "import { main } from './build/app.js';\nmain();\n" > "$out/entry.js"
root=$(cd "$pkg/../../.." && pwd)
# NODE_PATH lets esbuild find React from an output folder outside the repository.
# DEUS_REACT_ENV=production builds React's production bundle, minified, as the hosted demo serves it.
mode=${DEUS_REACT_ENV:-development}
extra=()
[ "$mode" = production ] && extra=(--minify)
NODE_PATH="$root/node_modules" "$root/node_modules/.bin/esbuild" "$out/entry.js" --bundle --format=esm --sourcemap \
  --define:process.env.NODE_ENV="\"$mode\"" "${extra[@]}" --outfile="$out/bundle.js" --log-level=warning
cp "$here/index.html" "$here/app.css" "$out/"
echo "Built $out (open index.html through a static server)."
