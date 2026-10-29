#!/usr/bin/env bash
# Downloads one file (layer) of a workspace snapshot from public GHCR.
# Usage: fetch.sh <repository> <tag> <file> <dest>, e.g. fetch.sh ghcr.io/dxos/gh-actions ws-latest-sqfs workspace.sqfs /mnt/ws/workspace.sqfs
# Exits non-zero on any failure, including a snapshot that has no such file.
set -euo pipefail

repository=$1
tag=$2
file=$3
dest=$4

repo=${repository#ghcr.io/}
token=$(curl -fsS "https://ghcr.io/token?scope=repository:$repo:pull" | jq -r .token)
layer=$(curl -fsS -H "Authorization: Bearer $token" -H 'Accept: application/vnd.oci.image.manifest.v1+json' \
  "https://ghcr.io/v2/$repo/manifests/$tag" |
  jq -r --arg file "$file" 'first(.layers[] | select(.annotations["org.opencontainers.image.title"] == $file)) | "\(.digest) \(.size)"')
if [ -z "$layer" ]; then
  echo "$repository:$tag has no $file" >&2
  exit 1
fi
digest=${layer% *}
size=${layer#* }
fallocate -l "$size" "$dest"

# 8 parallel ranges, each written at its own offset: one stream from GHCR is several times slower.
# A broken transfer fails curl (`-f`, or exit 18 on a short read); a corrupt image fails the mount.
start=$(date +%s.%N)
parts=8
chunk=$(((size + parts - 1) / parts))
pids=()
for i in $(seq 0 $((parts - 1))); do
  from=$((i * chunk))
  to=$((from + chunk - 1 < size - 1 ? from + chunk - 1 : size - 1))
  (curl -fsSL -H "Authorization: Bearer $token" -r "$from-$to" "https://ghcr.io/v2/$repo/blobs/$digest" |
    dd of="$dest" bs=4M iflag=fullblock oflag=seek_bytes seek="$from" conv=notrunc status=none) &
  pids+=($!)
done
for pid in "${pids[@]}"; do wait "$pid"; done
printf 'download %s: %.1fs, %d MB\n' "$file" "$(echo "$(date +%s.%N) - $start" | bc)" $((size / 1000000))
