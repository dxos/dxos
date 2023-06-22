set -exuo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &> /dev/null && pwd)
. $SCRIPT_DIR/env.sh

# Get password.
PASSWORD=$(ssh ubuntu@$IP "sudo cat /var/lib/faasd/secrets/basic-auth-password")
echo $PASSWORD | faas-cli login --password-stdin

# TODO(burdon): Option to open.
# Username=admin
#open http://$IP:8080
