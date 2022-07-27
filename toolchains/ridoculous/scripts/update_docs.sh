#!/bin/sh

# https://stackoverflow.com/questions/1371261/get-current-directory-name-without-full-path-in-a-bash-script

BASE_DIR=$(realpath "$PWD/../../")

echo "${BASE_DIR}$(echo '/docs/design/**')"

yarn ts-node --esm ./src/main.ts \
  --verbose \
  --files "${BASE_DIR}$(echo '/docs/design/**/*.md')" \
  --out-dir $BASE_DIR/docs \
  --auto-number \
#  --dry-run \
