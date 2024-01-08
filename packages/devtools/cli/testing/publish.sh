#!/bin/bash -x

pushd ./testing/app > /dev/null

export DX_CONFIG=../../config/config.yml
export PATH=$PATH:../../bin

# Publish mock app.
dx app publish --verbose

# List published apps.
dx app list

popd > /dev/null
