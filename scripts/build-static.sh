#!/bin/sh

#
# Build static site for deploy by Netlify, etc.
#

yarn build:storybook

mkdir -p ./out

for i in "spore" "globe"
do
  cp -R ./packages/$i/out ./out/$i
done
