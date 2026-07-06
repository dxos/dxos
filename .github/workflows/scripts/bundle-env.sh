#!/usr/bin/env bash
#
# Copyright 2026 DXOS.org
#

# Build the selected app(s)' bundle for an environment. Reads deploy-manifest.json, resolves the apps that
# deploy to <environment>, and runs each app's bundle task with its env-specific config (DX_ENVIRONMENT +
# PostHog). Deploying is a separate step — see deploy-env.sh.
#
# An app whose output dir is already populated is skipped: that is how a bundle prebuilt once and shared via
# artifact is reused (the build-sharing fan-out downloads it into the output dir before this runs, so no
# rebuild — see docs/design/deploy-build-sharing.md).
#
# Usage: bundle-env.sh <environment> [app|all]

set -euo pipefail

ENVIRONMENT="${1:?usage: bundle-env.sh <environment> [app|all]}"
APP="${2:-all}"
ROOT="$(git rev-parse --show-toplevel)"
MANIFEST="$ROOT/.github/workflows/deploy-manifest.json"

export DX_ENVIRONMENT="$ENVIRONMENT"

# Resolve target apps (0x1f-joined — see deploy-env.sh for why not a tab). Fields: name, bundleTask, outDir.
mapfile -t TARGETS < <(node -e '
  const SEP = String.fromCharCode(31);
  const manifest = require(process.argv[1]);
  const [environment, only] = process.argv.slice(2);
  for (const [name, cfg] of Object.entries(manifest)) {
    if (name === "//" || !cfg.environments) continue;
    if (!cfg.environments.includes(environment)) continue;
    if (only !== "all" && only !== name) continue;
    console.log([name, cfg.bundleTask, cfg.outDir].join(SEP));
  }
' "$MANIFEST" "$ENVIRONMENT" "$APP")

if [ "${#TARGETS[@]}" -eq 0 ]; then
  echo "No apps configured for environment=$ENVIRONMENT app=$APP — nothing to bundle."
  exit 0
fi

for target in "${TARGETS[@]}"; do
  IFS=$'\x1f' read -r name task outDir <<< "$target"

  echo "::group::Bundle ${name} -> ${ENVIRONMENT}"
  if [ -d "$ROOT/$outDir" ] && [ -n "$(ls -A "$ROOT/$outDir" 2>/dev/null)" ]; then
    echo "Output ${outDir} already present — reusing prebuilt bundle; skipping ${task}."
    echo "::endgroup::"
    continue
  fi

  # Scope the build env to this app (subshell) so one app's PostHog config can't leak into the next.
  # populate-env.sh exports the app's PostHog vars under its package prefix (composer-app ->
  # COMPOSER_APP_POSTHOG_*); the Vite build reads the DX_POSTHOG_* names, so map them before bundling.
  (
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
  )
  echo "::endgroup::"
done
