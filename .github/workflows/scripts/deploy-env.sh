#!/usr/bin/env bash
#
# Copyright 2026 DXOS.org
#

# Generic, environment-aware app deploy. Reads .github/workflows/deploy-manifest.json and deploys the
# selected app(s) to one of the four environments (main|labs|staging|production) on Cloudflare Workers
# Static Assets (`wrangler deploy`). Decoupled from npm publishing — this never runs changeset publish.
#
# Usage: deploy-env.sh <environment> [app|all]
#   environment : main | labs | staging | production
#   app         : a manifest key (e.g. composer, docs) or "all" (default)
#
# Cloudflare Pages aliased environments under one project via `--branch`; Workers instead uses one Worker
# per environment. Production deploys to the bare Worker name (`<worker>`), which carries the real custom
# domain; other envs deploy to `<worker>-<env>` (its own preview domain). DX_ENVIRONMENT is exported so
# builds can branch on it (e.g. staging pre-release config).

set -euo pipefail

ENVIRONMENT="${1:?usage: deploy-env.sh <environment> [app|all]}"
APP="${2:-all}"
ROOT="$(git rev-parse --show-toplevel)"
MANIFEST="$ROOT/.github/workflows/deploy-manifest.json"

# Workers Static Assets requires a compatibility date; assets-only Workers don't use runtime APIs, so this
# only needs to be a valid, reasonably recent date — pin it rather than tracking latest.
COMPAT_DATE="2024-11-01"

export DX_ENVIRONMENT="$ENVIRONMENT"

# Resolve target apps for this environment (tab-separated: name, bundleTask, outDir, worker, notFoundHandling).
mapfile -t TARGETS < <(node -e '
  const manifest = require(process.argv[1]);
  const [environment, only] = process.argv.slice(2);
  for (const [name, cfg] of Object.entries(manifest)) {
    if (name === "//" || !cfg.environments) continue;
    if (!cfg.environments.includes(environment)) continue;
    if (only !== "all" && only !== name) continue;
    console.log([name, cfg.bundleTask, cfg.outDir, cfg.worker, cfg.notFoundHandling || "none"].join("\t"));
  }
' "$MANIFEST" "$ENVIRONMENT" "$APP")

if [ "${#TARGETS[@]}" -eq 0 ]; then
  echo "No apps configured for environment=$ENVIRONMENT app=$APP — nothing to deploy."
  exit 0
fi

# A generated wrangler config lives at the repo root so its relative `assets.directory` resolves against
# the checkout; removed on exit regardless of outcome.
WRANGLER_CONFIG="$ROOT/wrangler.deploy.json"
trap 'rm -f "$WRANGLER_CONFIG"' EXIT

for target in "${TARGETS[@]}"; do
  IFS=$'\t' read -r name task outDir worker notFoundHandling <<< "$target"

  # Production owns the bare Worker name (and the real custom domain); every other env gets a suffixed
  # Worker so labs/staging/main never collide with production.
  if [ "$ENVIRONMENT" = "production" ]; then
    workerName="$worker"
  else
    workerName="${worker}-${ENVIRONMENT}"
  fi

  echo "::group::Deploy ${name} -> ${ENVIRONMENT} (worker: ${workerName})"
  moon run "$task"

  node -e '
    const fs = require("fs");
    const [out, worker, directory, compatDate, notFoundHandling] = process.argv.slice(1);
    fs.writeFileSync(out, JSON.stringify({
      name: worker,
      compatibility_date: compatDate,
      assets: { directory, not_found_handling: notFoundHandling },
    }, null, 2));
  ' "$WRANGLER_CONFIG" "$workerName" "$outDir" "$COMPAT_DATE" "$notFoundHandling"

  pnpm exec wrangler deploy --config "$WRANGLER_CONFIG"
  echo "::endgroup::"
done
