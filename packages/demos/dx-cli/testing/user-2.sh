#!/bin/bash -x

export DX_CONFIG=./testing/config/user-2.yml

dx=./bin/run

# Create Profile
PUBLIC_KEY=$($dx halo --json | jq --raw-output '.publicKey')
if [ -z "$PUBLIC_KEY" ];
then
  $dx reset
  $dx halo create
fi

# Join Space
$dx space join
