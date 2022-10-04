#!/usr/bin/env bash
set -euxo pipefail

SCRIPT_DIR=$(cd $(dirname "${BASH_SOURCE[0]}") && pwd)

pnpm jscodeshift --parser=ts --extensions=ts "$SCRIPT_DIR/../../../**/*.ts" "$@"