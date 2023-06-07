set -exuo pipefail

# TODO(burdon): Get from multipass.
export IP=$(multipass info faasd | grep IPv4 | awk '{print $2}')
export OPENFAAS_URL=http://$IP:8080
echo "Server: $IP"

# TODO(burdon): Optional param.
# Get password.
# ssh ubuntu@$IP "sudo cat /var/lib/faasd/secrets/basic-auth-password" | faas-cli login --password-stdin

faas-cli template pull https://github.com/dxos/openfaas-node18-dxos

FILE=chess.yml
FUNCTION=chess

# Build and upload to GH registry.
# NOTE: uses modified template with deps for libsodium.
faas-cli publish -f $FILE --platforms linux/arm64

# Deploy to faasd.
# NOTE: May timeout in which case retry until succeeds (makes iterative progress).
faas-cli deploy --timeout=5m0s -f $FILE

# TODO(burdon): Test with client daemon.
echo "{}" | faas-cli invoke -f $FILE $FUNCTION

# Expect 400
echo $?

faas-cli logs --tail=false $FUNCTION
