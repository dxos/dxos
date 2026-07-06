#!/usr/bin/env bash
#
# Copyright 2026 DXOS.org
#

# Deploy already-built app(s) to a Cloudflare environment via `wrangler deploy`. Reads deploy-manifest.json,
# resolves the apps for <environment>, and deploys each using its committed Workers config (`wranglerConfig`)
# — every app owns one (composer: a `_worker.js` Worker + bindings; the rest: assets-only), so nothing is
# generated at deploy time. Building is a separate step (bundle-env.sh); this assumes each app's output dir
# is already populated.
#
# The per-env Worker is selected with `--env <environment>`: each config's [env.<environment>] sets the
# Worker name — production = the bare name that carries the custom domain, other envs = <name>-<env>.
#
# Usage: deploy-env.sh <environment> [app|all]

set -euo pipefail

ENVIRONMENT="${1:?usage: deploy-env.sh <environment> [app|all]}"
APP="${2:-all}"
ROOT="$(git rev-parse --show-toplevel)"
MANIFEST="$ROOT/.github/workflows/deploy-manifest.json"

export DX_ENVIRONMENT="$ENVIRONMENT"

# Resolve target apps (0x1f-joined, not a tab: a manifest field can be empty and tab is IFS-whitespace, so
# `read` would collapse consecutive tabs and shift fields; 0x1f is not whitespace). Fields: name, outDir,
# wranglerConfig.
mapfile -t TARGETS < <(node -e '
  const SEP = String.fromCharCode(31);
  const manifest = require(process.argv[1]);
  const [environment, only] = process.argv.slice(2);
  for (const [name, cfg] of Object.entries(manifest)) {
    if (name === "//" || !cfg.environments) continue;
    if (!cfg.environments.includes(environment)) continue;
    if (only !== "all" && only !== name) continue;
    console.log([name, cfg.outDir, cfg.wranglerConfig].join(SEP));
  }
' "$MANIFEST" "$ENVIRONMENT" "$APP")

if [ "${#TARGETS[@]}" -eq 0 ]; then
  echo "No apps configured for environment=$ENVIRONMENT app=$APP — nothing to deploy."
  exit 0
fi

for target in "${TARGETS[@]}"; do
  IFS=$'\x1f' read -r name outDir wranglerConfig <<< "$target"

  echo "::group::Deploy ${name} -> ${ENVIRONMENT}"

  # A `_worker.js` in the asset dir is the Worker script (Pages advanced-mode carryover), not an asset —
  # keep it out of the upload. Pure-static apps have no `_worker.js`, so this is a no-op for them.
  if [ -f "$ROOT/$outDir/_worker.js" ]; then
    printf '_worker.js\n' > "$ROOT/$outDir/.assetsignore"
  fi

  pnpm exec wrangler deploy --config "$ROOT/$wranglerConfig" --env "$ENVIRONMENT"
  echo "::endgroup::"
done
