#!/usr/bin/env zsh

set -euxo pipefail

pnpm jscodeshift --parser=ts --extensions=ts ../../**/*.ts "$@"
