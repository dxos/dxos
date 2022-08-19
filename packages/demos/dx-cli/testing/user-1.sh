#!/bin/bash -x

export DX_CONFIG=./testing/config/user-1.yml

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
  # TODO(burdon): Error if reset above, then check halo, then create halo. Need to reset.
  #   Error [OpenError]: Error parsing JSON in /tmp/dxos/dx-cli/user-1/keystore/data.json: Unexpected end of JSON input
  $dx reset
  $dx halo create
fi

# Create Space
KEY=$($dx space create --json | jq --raw-output '.key')
echo $KEY > /tmp/dx-cli/testing/party_key.txt

# Create Invitation
$dx space invite $KEY
