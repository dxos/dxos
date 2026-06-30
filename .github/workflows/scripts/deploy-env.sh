#!/usr/bin/env bash
#
# Copyright 2026 DXOS.org
#

# Generic, environment-aware app deploy. Reads .github/workflows/deploy-manifest.json and deploys the
# selected app(s) to one of the four environments (main|labs|staging|production) on Cloudflare Pages.
# Decoupled from npm publishing — this never runs changeset publish.
#
# Usage: deploy-env.sh <environment> [app|all]
#   environment : main | labs | staging | production
#   app         : a manifest key (e.g. composer, docs) or "all" (default)
#
# The Cloudflare environment is selected by the --branch value (production = the project's production
# branch; main/labs/staging = preview aliases). DX_ENVIRONMENT is exported so builds can branch on it
# (e.g. staging pre-release config).

set -euo pipefail

ENVIRONMENT="${1:?usage: deploy-env.sh <environment> [app|all]}"
APP="${2:-all}"
ROOT="$(git rev-parse --show-toplevel)"
MANIFEST="$ROOT/.github/workflows/deploy-manifest.json"

export DX_ENVIRONMENT="$ENVIRONMENT"

# Resolve target apps for this environment (tab-separated: name, bundleTask, outDir, project).
mapfile -t TARGETS < <(node -e '
  const manifest = require(process.argv[1]);
  const [environment, only] = process.argv.slice(2);
  for (const [name, cfg] of Object.entries(manifest)) {
    if (name === "//" || !cfg.environments) continue;
    if (!cfg.environments.includes(environment)) continue;
    if (only !== "all" && only !== name) continue;
    console.log([name, cfg.bundleTask, cfg.outDir, cfg.project].join("\t"));
  }
' "$MANIFEST" "$ENVIRONMENT" "$APP")

if [ "${#TARGETS[@]}" -eq 0 ]; then
  echo "No apps configured for environment=$ENVIRONMENT app=$APP — nothing to deploy."
  exit 0
fi

for target in "${TARGETS[@]}"; do
  IFS=$'\t' read -r name task outDir project <<< "$target"
  echo "::group::Deploy ${name} -> ${ENVIRONMENT}"
  moon run "$task"
  pnpm exec wrangler pages deploy "$ROOT/$outDir" --project-name "$project" --branch "$ENVIRONMENT"
  echo "::endgroup::"
done
