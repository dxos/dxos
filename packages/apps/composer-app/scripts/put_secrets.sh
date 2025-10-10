#!/bin/sh

# brew install 1password-cli
function put_secret()
{
  op item get "${2}" --fields label="${3}" | wrangler pages secret put --env "${1}" "${3}"
}

put_secret preview composer.space DX_SENTRY_DESTINATION
put_secret preview composer.space DX_TELEMETRY_API_KEY
put_secret preview composer.space IPFS_API_SECRET
put_secret preview composer.space JWT_SECRET

put_secret production composer.space DX_SENTRY_DESTINATION
put_secret production composer.space DX_TELEMETRY_API_KEY
put_secret production composer.space IPFS_API_SECRET
put_secret production composer.space JWT_SECRET
put_secret production composer.space SENTRY_RELEASE_AUTH_TOKEN
put_secret production composer.space DX_OTEL_ENDPOINT
put_secret production composer.space DX_OTEL_HEADERS
