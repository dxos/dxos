set -exuo pipefail

#
# NOTE: Docker Desktop must be running.
#

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &> /dev/null && pwd)
. $SCRIPT_DIR/env.sh

pushd functions

FN_NAME="$1"
FN_CONFIG="${FN_NAME}.yml"
if [ ! -f $FN_CONFIG ]; then
  echo "Missing config: $FN_CONFIG"
  exit 1
fi

# Get template.
# NOTE: uses modified template with deps for libsodium.
faas-cli template pull https://github.com/dxos/openfaas-node18-dxos

echo "\n###\n### Publishing $FN_CONFIG\n###\n"

# Build and upload to GH package registry.
# Cache option.
NO_CACHE=0
faas-cli publish -f $FN_CONFIG --platforms=linux/arm64
#  --no-cache=$NO_CACHE

echo "\n###\n### Deploying $FN_CONFIG\n###\n"

# Deploy to faasd server.
# NOTE: Publishes to GH Package Registry (see image name in YML).
# - Configure visibility https://github.com/orgs/dxos/packages
# NOTE: May timeout in which case retry until succeeds (makes iterative progress).
faas-cli deploy --timeout=5m0s -f $FN_CONFIG

# TODO(burdon): Test with client daemon.
# echo "{}" | faas-cli invoke -f $FN_CONFIG $FN_NAME
# echo $?

# echo "\n###\n### Logging $FN_NAME\n###\n"
# faas-cli logs --tail=false $FN_NAME

popd
