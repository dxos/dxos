#!/bin/sh

yarn build
yarn test

if [ $? -eq 0 ]; then
  yarn lerna publish prerelease --dist-tag="beta" --force-publish
fi
