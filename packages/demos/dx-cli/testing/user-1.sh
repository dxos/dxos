#!/bin/bash -x

export DX_CONFIG=./testing/config/user-1.yml

dx=./bin/run

# Create Profile
PUBLIC_KEY=$($dx halo --json | jq --raw-output '.publicKey')
if [ -z "$PUBLIC_KEY" ];
then
  $dx reset
  $dx halo create
fi

# Create Space
KEY=$($dx space create --json | jq --raw-output '.key')
echo $KEY > /tmp/dx-cli/testing/party_key.txt

# Create Invitation
$dx space invite $KEY
