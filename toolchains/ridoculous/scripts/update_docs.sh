#!/bin/sh

# https://stackoverflow.com/questions/1371261/get-current-directory-name-without-full-path-in-a-bash-script

BASE_DIR=$(realpath "$PWD/../../")

yarn ts-node --esm ./src/main.ts \
  --verbose \
  --files "design/**/*.md" \
  --base-dir $BASE_DIR/docs \
  --out-dir $BASE_DIR/docs \
  --auto-number \
  --dry-run
