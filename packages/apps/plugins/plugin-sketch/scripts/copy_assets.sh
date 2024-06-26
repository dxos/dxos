#!/bin/sh

DEST="./dist/assets"

rm -rf ${DEST}
mkdir -p ${DEST}

cp -R ./node_modules/@tldraw/assets/embed-icons ${DEST}

rsync -av --ignore-existing ./assets/ ${DEST}/
