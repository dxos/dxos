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
# Build-sharing (see docs/design/deploy-build-sharing.md), via env vars:
#   SKIP_DEPLOY=1        build the selected app(s) but do NOT deploy — the prep job that produces the
#                        shared bundle artifact.
#   PREBUILT_APPS="a b"  space-separated app names whose bundle is already present (downloaded from the
#                        prep artifact); skip `moon run <task>` for them and deploy the existing output.
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

# Resolve target apps for this environment. Fields are joined with the US control char (0x1f), NOT a tab:
# a manifest value can be empty (e.g. `worker` is absent when an app uses `wranglerConfig`), and tab is an
# IFS-whitespace char, so `read` would collapse consecutive tabs and shift every field left. 0x1f is not
# whitespace, so empty fields are preserved. Fields: name, bundleTask, outDir, worker, notFoundHandling,
# wranglerConfig.
mapfile -t TARGETS < <(node -e '
  const SEP = String.fromCharCode(31);
  const manifest = require(process.argv[1]);
  const [environment, only] = process.argv.slice(2);
  for (const [name, cfg] of Object.entries(manifest)) {
    if (name === "//" || !cfg.environments) continue;
    if (!cfg.environments.includes(environment)) continue;
    if (only !== "all" && only !== name) continue;
    console.log([name, cfg.bundleTask, cfg.outDir, cfg.worker || "", cfg.notFoundHandling || "none", cfg.wranglerConfig || ""].join(SEP));
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
  IFS=$'\x1f' read -r name task outDir worker notFoundHandling wranglerConfig <<< "$target"

  echo "::group::Deploy ${name} -> ${ENVIRONMENT}"

  # Build unless this app's bundle was prebuilt (downloaded from the prep job's shared artifact).
  if [[ " ${PREBUILT_APPS:-} " == *" ${name} "* ]]; then
    echo "Using prebuilt bundle for ${name} (${outDir}); skipping ${task}."
  else
    # populate-env.sh exports the app's PostHog config under its package prefix (e.g. composer-app →
    # COMPOSER_APP_POSTHOG_*); the Vite build reads the DX_POSTHOG_* names, so map them before bundling.
    pkgPrefix="${task%%:*}"          # composer-app:bundle -> composer-app
    pkgPrefix="${pkgPrefix^^}"       # -> COMPOSER-APP
    pkgPrefix="${pkgPrefix//-/_}"    # -> COMPOSER_APP
    apiKeyVar="${pkgPrefix}_POSTHOG_API_KEY"
    if [ -n "${!apiKeyVar:-}" ]; then
      projectVar="${pkgPrefix}_POSTHOG_PROJECT_ID"
      surveyVar="${pkgPrefix}_POSTHOG_FEEDBACK_SURVEY_ID"
      export DX_POSTHOG_API_KEY="${!apiKeyVar}"
      export DX_POSTHOG_PROJECT_ID="${!projectVar:-}"
      export DX_POSTHOG_FEEDBACK_SURVEY_ID="${!surveyVar:-}"
      export LOG_FILTER="error"
    fi
    moon run "$task"
  fi

  # Prep-job mode: build only, don't deploy (the caller uploads the built output as a shared artifact).
  if [ -n "${SKIP_DEPLOY:-}" ]; then
    echo "SKIP_DEPLOY set — built ${name}, not deploying."
    echo "::endgroup::"
    continue
  fi

  if [ -n "$wranglerConfig" ]; then
    # App ships its own Workers config (a `_worker.js` Worker + ASSETS binding, e.g. composer). The env's
    # Worker name + bindings come from that config's [env.<environment>] section. `_worker.js` lives inside
    # the asset dir, so keep it out of the asset upload (it is the Worker script, not an asset).
    printf '_worker.js\n' > "$ROOT/$outDir/.assetsignore"
    pnpm exec wrangler deploy --config "$ROOT/$wranglerConfig" --env "$ENVIRONMENT"
  else
    # Static app: generate a minimal assets-only Worker. Production owns the bare Worker name (and the real
    # custom domain); every other env gets a suffixed Worker so labs/staging/main never collide with it.
    if [ "$ENVIRONMENT" = "production" ]; then
      workerName="$worker"
    else
      workerName="${worker}-${ENVIRONMENT}"
    fi
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
  fi
  echo "::endgroup::"
done
