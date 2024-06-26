#!/bin/sh

SRC="./node_modules/@tldraw/assets"
DEST="./dist/assets"

rm -rf ${DEST}
mkdir -p ${DEST}

cp -R ${SRC}/embed-icons ${DEST}
cp -R ${SRC}/fonts ${DEST}
cp -R ${SRC}/icons ${DEST}
cp -R ${SRC}/translations ${DEST}

rsync -av --ignore-existing ./assets/ ${DEST}/
