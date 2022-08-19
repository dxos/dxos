#!/bin/bash -x

export DX_CONFIG=./testing/config/user-2.yml

dx=./bin/run

# Reset
if [ "$1" = '--reset' ];
then
  $dx reset
fi

# Create Profile
PUBLIC_KEY=$($dx halo --json | jq --raw-output '.publicKey' 2>/dev/null)
if [ -z "$PUBLIC_KEY" ];
then
  $dx halo create
fi

# Join Space
$dx space join
