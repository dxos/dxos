#!/bin/sh

echo

#
# Build static site for deploy by Netlify, etc.
#

rm -rf ./out
mkdir -p ./out

yarn build
yarn build:storybook

for i in "core" "canvas" "experimental" "globe" "isometric" "spore" "widgets"
do
  cp -R ./packages/$i/out ./out/$i
done

cp ./static/index.html ./out
