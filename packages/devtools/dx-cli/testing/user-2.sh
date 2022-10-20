#!/bin/bash -x

export DX_CONFIG=./testing/config/user-2.yml

dx=./bin/run

# Reset
if [ "$1" = '--reset' ];
then
  $dx reset
fi

# Create Profile
PUBLIC_KEY=$($dx halo --json | jq --raw-output '.public_key' 2>/dev/null)
if [ "$PUBLIC_KEY" = 'null' ];
then
  # TODO(burdon): Error attempt to create space with null halo before creating profile.
  #   Error [OpenError]: Error parsing JSON in /tmp/dxos/dx-cli/user-1/keystore/data.json: Unexpected end of JSON input
  $dx reset
  $dx halo create
fi

# Join Space
$dx space join

# List spaces
$dx space list
