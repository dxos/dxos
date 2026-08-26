#!/bin/bash
# Restore the full tree of $1, build the e2e bundle and run collections.spec.ts.
set -e
cd /home/user/dxos
git reset --hard -q HEAD && git clean -fdq
comm -13 <(git ls-tree -r --name-only "$1" | sort) <(git ls-files | sort) | xargs -r rm -f
git checkout "$1" -- .
pnpm exec moon run composer-app:bundle-e2e > /tmp/claude-0/-home-user-dxos/4ef01b03-c7c1-5707-afa4-3af67a186422/scratchpad/bundle.log 2>&1 || { echo "BUILD FAILED"; exit 1; }
cd packages/apps/composer-app
DX_EDGE_BASE_URL='https://dxos.network' DX_TELEMETRY_TAG=e2e DX_PWA=false \
  npx playwright test --config=src/playwright/playwright.config.ts src/playwright/collections.spec.ts \
  --workers=1 --reporter=line 2>&1 | tail -6
