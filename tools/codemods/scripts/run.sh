#!/usr/bin/env bash
set -euxo pipefail

SCRIPT_DIR=$(cd $(dirname "${BASH_SOURCE[0]}") && pwd)

for FILE in $SCRIPT_DIR/../../../**/*.ts; do 
  [ -f "$FILE" ] && pnpm jscodeshift --parser=ts --extensions=ts "$FILE" "$@";
done