#!/usr/bin/env bash
# Issue the mTLS material for the self-hosted moon remote cache: a private CA, a server
# certificate for the cache host, and a client certificate for moon.
#
# The CA key never leaves the operator's machine — it is the only thing that can mint new
# clients, so losing it means re-issuing every certificate, and leaking it means anyone can
# read and poison the cache.
#
#   ./gen-certs.sh <output-dir> <cache-ip> [dns-name ...]
#   ./gen-certs.sh --server <ca-dir> <output-dir> <cache-ip> [dns-name ...]
#
# Produces, in <output-dir>:
#   ca.pem / ca.key          the CA (key stays local, never deployed, never committed)
#   server.pem / server.key  deployed to the cache host
#   client.pem / client.key  consumed by moon, and stored as CI secrets
#
# `--server` issues only a server certificate from an existing CA — for a second cache host, so
# every host shares one CA and clients need no new material. Give the new host every name clients
# might dial it by, including the primary one: moon verifies against `mtls.domain` in
# workspace.yml regardless of the address it connected to, so a host whose certificate lacks that
# name fails verification even when the address is right.
set -euo pipefail

SERVER_ONLY=false
if [ "${1:-}" = "--server" ]; then
  SERVER_ONLY=true
  CA_DIR="${2:?missing CA directory}"
  shift 2
fi

OUT="${1:?usage: gen-certs.sh [--server <ca-dir>] <output-dir> <cache-ip> [dns-name ...]}"
IP="${2:?missing cache IP}"
shift 2
DNS_NAMES=("$@")
[ ${#DNS_NAMES[@]} -eq 0 ] && DNS_NAMES=("cache.dxos.network")

# Ten years: these are private-CA certificates with no revocation path, so rotation is a
# deliberate operation rather than something that should surprise CI on a random morning.
DAYS=3650

mkdir -p "$OUT"
cd "$OUT"

san="IP:$IP"
for name in "${DNS_NAMES[@]}"; do san="$san,DNS:$name"; done

if [ "$SERVER_ONLY" = true ]; then
  cp "$CA_DIR/ca.pem" ca.pem
  cp "$CA_DIR/ca.key" ca.key
else
  openssl req -x509 -newkey rsa:4096 -sha256 -days $DAYS -nodes \
    -keyout ca.key -out ca.pem \
    -subj "/CN=DXOS moon cache CA" \
    -addext "basicConstraints=critical,CA:TRUE" \
    -addext "keyUsage=critical,keyCertSign,cRLSign" 2>/dev/null
fi

openssl req -newkey rsa:4096 -sha256 -nodes -keyout server.key -out server.csr \
  -subj "/CN=${DNS_NAMES[0]}" 2>/dev/null
openssl x509 -req -in server.csr -CA ca.pem -CAkey ca.key -CAcreateserial \
  -days $DAYS -sha256 -out server.pem \
  -extfile <(printf 'subjectAltName=%s\nextendedKeyUsage=serverAuth\nkeyUsage=critical,digitalSignature,keyEncipherment\n' "$san") 2>/dev/null

if [ "$SERVER_ONLY" != true ]; then
  openssl req -newkey rsa:4096 -sha256 -nodes -keyout client.key -out client.csr \
    -subj "/CN=moon-client" 2>/dev/null
  openssl x509 -req -in client.csr -CA ca.pem -CAkey ca.key -CAcreateserial \
    -days $DAYS -sha256 -out client.pem \
    -extfile <(printf 'extendedKeyUsage=clientAuth\nkeyUsage=critical,digitalSignature\n') 2>/dev/null
else
  # The CA key is never left beside a server certificate that is about to be copied to a host.
  rm -f ca.key
fi

rm -f server.csr client.csr ca.srl
chmod 600 ./*.key

echo "wrote $OUT:"
ls -1 "$PWD"
echo
echo "server SANs: $san"
openssl x509 -in server.pem -noout -dates
