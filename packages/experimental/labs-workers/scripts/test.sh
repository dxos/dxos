#!/bin/sh

set -euxo pipefail

# Create table.
npx wrangler d1 execute dev-users --remote --file=./sql/schema.sql

# Test data.
npx wrangler d1 execute dev-users --remote --file=./sql/testing.sql

# Authorize first user.
curl -s -X POST -H "Content-Type: application/json" -H "X-API-KEY: $DX_API_KEY" \
  https://labs-workers.dxos.workers.dev/api/users/authorize --data '{ "next": 1 }' | jq

USER=$(npx wrangler d1 execute dev-users --remote --json \
  --command="SELECT email, access_token FROM Users WHERE status = 'A'" | jq -r ".[0].results[0]")

EMAIL=$(echo $USER | jq -r ".email")
ACCESS_TOKEN=$(echo $USER | jq -r ".access_token")

# Get the token.
curl -I --get --data-urlencode="access_token=${ACCESS_TOKEN}" --data-urlencode="email=${EMAIL}" https://labs-workers.dxos.workers.dev/access

# Test the token.
curl -H "Cookie: access_token=value" https://labs-workers.dxos.workers.dev/app
