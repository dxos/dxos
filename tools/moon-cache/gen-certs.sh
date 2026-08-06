#!/usr/bin/env bash
# Issue the mTLS material for the self-hosted moon remote cache: a private CA, a server
# certificate for the cache host, and a client certificate for moon.
#
# The CA key never leaves the operator's machine — it is the only thing that can mint new
# clients, so losing it means re-issuing every certificate, and leaking it means anyone can
# read and poison the cache.
#
#   ./gen-certs.sh <output-dir> <cache-ip> [dns-name ...]
#
# Produces, in <output-dir>:
#   ca.pem / ca.key          the CA (key stays local, never deployed, never committed)
#   server.pem / server.key  deployed to the cache host
#   client.pem / client.key  consumed by moon, and stored as CI secrets
set -euo pipefail

OUT="${1:?usage: gen-certs.sh <output-dir> <cache-ip> [dns-name ...]}"
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

openssl req -x509 -newkey rsa:4096 -sha256 -days $DAYS -nodes \
  -keyout ca.key -out ca.pem \
  -subj "/CN=DXOS moon cache CA" \
  -addext "basicConstraints=critical,CA:TRUE" \
  -addext "keyUsage=critical,keyCertSign,cRLSign" 2>/dev/null

openssl req -newkey rsa:4096 -sha256 -nodes -keyout server.key -out server.csr \
  -subj "/CN=${DNS_NAMES[0]}" 2>/dev/null
openssl x509 -req -in server.csr -CA ca.pem -CAkey ca.key -CAcreateserial \
  -days $DAYS -sha256 -out server.pem \
  -extfile <(printf 'subjectAltName=%s\nextendedKeyUsage=serverAuth\nkeyUsage=critical,digitalSignature,keyEncipherment\n' "$san") 2>/dev/null

openssl req -newkey rsa:4096 -sha256 -nodes -keyout client.key -out client.csr \
  -subj "/CN=moon-client" 2>/dev/null
openssl x509 -req -in client.csr -CA ca.pem -CAkey ca.key -CAcreateserial \
  -days $DAYS -sha256 -out client.pem \
  -extfile <(printf 'extendedKeyUsage=clientAuth\nkeyUsage=critical,digitalSignature\n') 2>/dev/null

rm -f server.csr client.csr ca.srl
chmod 600 ./*.key

echo "wrote $OUT:"
ls -1 "$PWD"
echo
echo "server SANs: $san"
openssl x509 -in server.pem -noout -dates
