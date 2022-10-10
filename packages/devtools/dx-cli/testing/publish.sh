#!/bin/bash -x

pushd ./testing/app > /dev/null

export DX_CONFIG=../../config/config.yml

dx=../../bin/run.js

# Publish mock app.
$dx app publish --verbose

# List published apps.
$dx app list

popd > /dev/null
