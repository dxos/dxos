#!/bin/sh

#
# Build static site for deploy by Netlify, etc.
# TODO(burdon): Missing files when deployed (e.g., iframe.html).
#

rm -rf ./out
mkdir -p ./out

yarn build
yarn build:storybook

for i in "canvas" "globe" "spore" "widgets"
do
  cp -R ./packages/$i/out ./out/$i
done
