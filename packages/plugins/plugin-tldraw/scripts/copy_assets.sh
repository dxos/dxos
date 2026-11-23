#!/bin/sh

# moon archives an empty output directory as a success and its cache hit then deletes the assets,
# so DEST is only ever complete or absent, even with a second run of this script in parallel.
set -eu

SRC="./node_modules/@tldraw/assets"
DEST="./dist/assets"
TMP="./dist/.assets-new.$$"
OLD="./dist/.assets-old.$$"

trap 'rm -rf "${TMP}" "${OLD}"' EXIT
mkdir -p "${TMP}"

cp -R ${SRC}/embed-icons "${TMP}"
cp -R ${SRC}/fonts "${TMP}"
cp -R ${SRC}/icons "${TMP}"
cp -R ${SRC}/translations "${TMP}"

cp -R ./assets/fonts/* "${TMP}/fonts"
cp -R ./assets/icons/icon/* "${TMP}/icons/icon"

mv "${DEST}" "${OLD}" 2>/dev/null || true
# rename(2), since `mv` nests inside a DEST that a parallel run just swapped in; that run's content is the same.
node -e '
  try {
    require("fs").renameSync(process.argv[1], process.argv[2]);
  } catch (error) {
    if (error.code !== "ENOTEMPTY" && error.code !== "EEXIST") {
      throw error;
    }
  }
' "${TMP}" "${DEST}"
