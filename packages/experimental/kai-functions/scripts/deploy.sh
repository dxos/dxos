set -exuo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &> /dev/null && pwd)
. $SCRIPT_DIR/env.sh

pushd functions

FN_NAME="$1"
FN_CONFIG="${FN_NAME}.yml"
if [ ! -f $FN_CONFIG ]; then
  echo "Missing config: $FN_CONFIG"
  exit 1
fi

echo "\n###\n### Building $FN_CONFIG\n###\n"

# Get template.
faas-cli template pull https://github.com/dxos/openfaas-node18-dxos

# Build and upload to GH registry.
# NOTE: uses modified template with deps for libsodium.
faas-cli publish -f $FN_CONFIG --platforms linux/arm64

# Deploy to faasd.
# NOTE: Publishes to GH Package Registry (see function YML); this may take a minute.
# - Configure https://github.com/orgs/dxos/packages
# NOTE: May timeout in which case retry until succeeds (makes iterative progress).
# TODO(burdon): Sometimes specifty --gateway path.
faas-cli deploy --timeout=5m0s -f $FN_CONFIG

# TODO(burdon): Test with client daemon.
# echo "{}" | faas-cli invoke -f $FN_CONFIG $FN_NAME
# echo $?

echo "\n###\n### Logging $FN_NAME\n###\n"

faas-cli logs --tail=false $FN_NAME

popd
