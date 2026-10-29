#!/usr/bin/env bash
#
# Copyright 2026 DXOS.org
#
# Builds the Ride Check Worker's checkout for the redeploy take: v1 committed, the gust rule (F-1.4) committed on top,
# and v1 deployed, so the take shows the change, deploys it and reloads the same URL.
#
#   CLOUDFLARE_API_TOKEN=... packages/plugins/plugin-debug/autocue/ride-check/prepare.sh /tmp/ride-check
#
set -euo pipefail
HERE=$(cd "$(dirname "$0")" && pwd)
WORK=${1:?usage: prepare.sh <work dir>}
# Absolute, since the setup below changes into it before the second `cd`.
case "$WORK" in /*) ;; *) WORK="$PWD/$WORK" ;; esac
GIT=(git -c user.name='Ride Check' -c user.email=ride-check@example.com)

if [ ! -d "$WORK/.git" ]; then
  if [ -d "$WORK" ] && [ -n "$(ls -A "$WORK")" ]; then
    echo "prepare.sh: $WORK exists and is not empty; pass a new directory" >&2
    exit 1
  fi
  mkdir -p "$WORK"
  cp -R "$HERE/__fixtures__/worker/." "$WORK/"
  cd "$WORK"
  printf 'node_modules\ndist\n.wrangler\n' > .gitignore
  "${GIT[@]}" init -q
  "${GIT[@]}" add -A
  "${GIT[@]}" commit -qm 'Ride Check v1'
  "${GIT[@]}" tag v1
  "${GIT[@]}" am -q "$HERE/__fixtures__/gust-rule.patch"
  "${GIT[@]}" tag v2
fi

cd "$WORK"
[ -d node_modules ] || npm install --no-audit --no-fund --loglevel error
git checkout -q v1
npm run --silent deploy
git checkout -q -B main v2
