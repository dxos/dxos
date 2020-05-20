#!/bin/sh

#
# Build static site for deploy by Netlify, etc.
# TODO(burdon): Broken: https://github.com/storybookjs/storybook/issues/1291
#

yarn build:storybook

mkdir -p ./out

for i in "canvas" "globe" "spore" "widgets"
do
  cp -R ./packages/$i/out ./out/$i
done
