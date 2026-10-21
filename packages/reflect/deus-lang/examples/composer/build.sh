#!/usr/bin/env bash
# Builds the DEUS Composer plugin (examples/composer/explorer.deus) into $1 (default
# examples/composer/out): `deus build --js` compiles it to an ES module, esbuild bundles it as
# index.mjs with every package Composer shares left as a bare import, and `deus explore --out`
# writes the explorer site it reads into site/. Serve the folder with CORS and load
# <url>/manifest.json in Composer (Plugins > Load from URL) from a production bundle, which has the
# import map that resolves the bare imports.
#
# The site shows $DEUS_SITE_CODEBASE, or else the toolchain's own codebase restored from codebase/.
set -euo pipefail
here=$(cd "$(dirname "$0")" && pwd)
pkg=$(cd "$here/../.." && pwd)
root=$(cd "$pkg/../../.." && pwd)
out=${1:-$here/out}
deus() { node "$pkg/bin/deus.mjs" "$@"; }

build=$(mktemp -d)
DEUS_CODEBASE=$build/codebase deus init > /dev/null
DEUS_CODEBASE=$build/codebase deus add "$pkg/platform/js/js.deus" "$pkg/platform/js/react.deus" \
  "$pkg/platform/js/composer.deus" "$here/explorer.deus" > /dev/null
mkdir -p "$out/build"
DEUS_CODEBASE=$build/codebase deus build DeusPlugin.plugin -o "$out/build/app.js" --js > /dev/null

printf "import { plugin } from './build/app.js';\nexport default plugin(new URL('./site/', import.meta.url).href);\n" > "$out/entry.js"
NODE_PATH="$root/node_modules" "$root/node_modules/.bin/esbuild" "$out/entry.js" --bundle --format=esm --sourcemap \
  --external:react --external:'react/*' --external:react-dom --external:'react-dom/*' \
  --external:effect --external:'effect/*' --external:'@dxos/*' --outfile="$out/index.mjs" --log-level=warning
cp "$here/index.css" "$out/index.css"
cat > "$out/manifest.json" << 'EOF'
{
  "key": "org.dxos.deus.explorer",
  "name": "DEUS",
  "version": "0.1.0",
  "description": "Browse a DEUS codebase and let the assistant program in DEUS. Written in DEUS.",
  "icon": { "key": "ph--function--regular", "hue": "indigo" },
  "assets": ["index.mjs", "index.css"]
}
EOF

site=${DEUS_SITE_CODEBASE:-}
if [ -z "$site" ]; then
  site=$build/toolchain
  (cd "$pkg/codebase" && DEUS_CODEBASE=$site deus init --empty > /dev/null &&
    DEUS_CODEBASE=$site deus project init https://dxos.org/deus/toolchain > /dev/null &&
    DEUS_CODEBASE=$site deus add code specs > /dev/null && DEUS_CODEBASE=$site deus task import tasks.sexp > /dev/null &&
    DEUS_CODEBASE=$site deus history import history.sexp > /dev/null)
fi
DEUS_CODEBASE=$site deus explore --out "$out/site" > /dev/null
echo "Built $out: serve it with CORS and load manifest.json in Composer."
