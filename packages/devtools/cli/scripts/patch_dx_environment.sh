#!/usr/bin/env bash
set -euo pipefail

if [[ -n "${DX_ENVIRONMENT-}" ]]; then
  if [[ "$(uname)" = "Darwin" ]]; then
    sed -i '' "s/production/$DX_ENVIRONMENT/g" bin/dx
  else
    sed -i "s/production/$DX_ENVIRONMENT/g" bin/dx
  fi
fi
