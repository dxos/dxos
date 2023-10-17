# Source into current shell via: `. ./scripts/env.sh`

export IP=$(multipass info faasd | grep IPv4 | awk '{print $2}')
export OPENFAAS_URL=http://$IP:8080

echo $OPENFAAS_URL
