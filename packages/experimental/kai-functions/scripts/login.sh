set -exuo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &> /dev/null && pwd)
. $SCRIPT_DIR/env.sh

# Get password.
PASSWORD=$(ssh ubuntu@$IP "sudo cat /var/lib/faasd/secrets/basic-auth-password")
echo $PASSWORD | faas-cli login --password-stdin

# Dashboard (username=admin)
# http://192.168.64.5:8080/ui
