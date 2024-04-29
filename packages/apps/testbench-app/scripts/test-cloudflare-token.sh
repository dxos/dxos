#!/bin/sh

# Test Cloudflare token.
# ./scripts/test-token.sh | jq

curl -X GET "https://api.cloudflare.com/client/v4/user/tokens/verify" \
     -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
     -H "Content-Type:application/json"
