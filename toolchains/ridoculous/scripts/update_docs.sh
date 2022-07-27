#!/bin/sh

# https://stackoverflow.com/questions/1371261/get-current-directory-name-without-full-path-in-a-bash-script

BASE_DIR=$(realpath "$PWD/../../")

echo $BASE_DIR

yarn ts-node --esm ./src/main.ts \
  --files $BASE_DIR/docs/**/*.md \
  --out-dir $BASE_DIR/docs \
  --base-dir $BASE_DIR \
  --auto-number
