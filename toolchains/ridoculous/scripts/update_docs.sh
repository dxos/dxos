#!/bin/sh

# Execute from toolchains/ridoculus

# https://stackoverflow.com/questions/1371261/get-current-directory-name-without-full-path-in-a-bash-script

realpath() {
  OURPWD=$PWD
  cd "$(dirname "$1")"
  LINK=$(readlink "$(basename "$1")")
  while [ "$LINK" ]; do
    cd "$(dirname "$LINK")"
    LINK=$(readlink "$(basename "$1")")
  done
  REALPATH="$PWD/$(basename "$1")"
  cd "$OURPWD"
  echo "$REALPATH"
}

BASE_DIR=$(realpath "$PWD/../../")

yarn ts-node --esm ./src/main.ts \
  --verbose \
  --files "design/**/*.md" \
  --base-dir $BASE_DIR/docs \
  --out-dir $BASE_DIR/docs \
  --auto-number \
#  --dry-run
