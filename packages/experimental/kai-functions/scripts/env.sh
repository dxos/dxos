export IP=$(multipass info faasd | grep IPv4 | awk '{print $2}')
export OPENFAAS_URL=http://$IP:8080

export DX_CLI_BIN="$(git rev-parse --show-toplevel)/packages/devtools/cli/bin/dev"
alias dx-dev="$DX_CLI_BIN"
