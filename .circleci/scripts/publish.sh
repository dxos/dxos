#!/bin/bash

BRANCH = $(git branch --show-current)

if [ $BRANCH -eq "release" ]; then
  DX_CONFIG = ../../packages/devtools/dx-cli/config/config.yml
else
  DX_CONFIG = ../../packages/devtools/dx-cli/config/dev-config.yml
fi

  ../../packages/devtools/dx-cli/bin/run app publish --verbose
