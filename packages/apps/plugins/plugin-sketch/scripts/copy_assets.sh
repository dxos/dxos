#!/bin/sh

"copy:assets": "rm -rf ./dist/assest && mkdir -p ./dist/assets && npm run copy:assets:tldraw && npm run copy:assets:local",
"copy:assets:local": "rsync -av --ignore-existing ./assets/ ./dist/assets/",
"copy:assets:tldraw": "cp -R ./node_modules/@tldraw/assets/embed-icons ./dist/assets",
