#!/bin/sh

SRC="./node_modules/@tldraw/assets"
DEST="./dist/assets"

rm -rf ${DEST}
mkdir -p ${DEST}

cp -R ${SRC}/embed-icons ${DEST}
cp -R ${SRC}/fonts ${DEST}
cp -R ${SRC}/icons ${DEST}
cp -R ${SRC}/translations ${DEST}

cp -R ./assets/fonts/* ${DEST}/fonts
cp -R ./assets/icons/icon/* ${DEST}/icons/icon
