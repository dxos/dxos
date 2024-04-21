#!/bin/sh

set -euxo pipefail

# Create table.
npx wrangler d1 execute dev-users --remote --file=./sql/schema.sql

# Insert test users.
npx wrangler d1 execute dev-users --remote --file=./sql/testing.sql

# Authorize first user (send email and update status).
curl -s -X POST -H "Content-Type: application/json" -H "X-API-KEY: $DX_API_KEY" \
  https://labs-workers.dxos.workers.dev/api/users/authorize --data '{ "next": 1 }' | jq

# Get authorized user.
USER=$(npx wrangler d1 execute dev-users --remote --json \
  --command="SELECT email, access_token FROM Users WHERE status = 'A'" | jq -r ".[0].results[0]")

EMAIL=$(echo $USER | jq -r ".email")
ACCESS_TOKEN=$(echo $USER | jq -r ".access_token")

# Check authorization and set the token.
curl -i --cookie-jar cookies.txt \
  --url-query "access_token=${ACCESS_TOKEN}" \
  --url-query "email=${EMAIL}" \
  https://labs-workers.dxos.workers.dev/access

cat cookies.txt

# Test the token.
curl -i -w '\n' --cookie cookies.txt https://labs-workers.dxos.workers.dev
