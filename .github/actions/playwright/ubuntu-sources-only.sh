#!/usr/bin/env bash
# Sets aside every apt source except Ubuntu's own archive, so a third-party repository that refuses the runner
# (packages.microsoft.com has answered 403) cannot fail the `apt-get update` behind Playwright's dependencies,
# which all come from Ubuntu.
set -euo pipefail

disabled=/etc/apt/sources.list.d.disabled
sudo mkdir -p "$disabled"
for file in /etc/apt/sources.list.d/*; do
  [ -f "$file" ] || continue
  if grep -qE 'archive\.ubuntu\.com|security\.ubuntu\.com|ports\.ubuntu\.com|apt-mirrors\.txt' "$file"; then
    continue
  fi
  sudo mv "$file" "$disabled/"
  echo "apt: set aside $(basename "$file")"
done
