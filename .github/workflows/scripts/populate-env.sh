#!/usr/bin/env bash
set -euo pipefail

# This script is intended to be run in a Github action. It will output environment variable delcarations, the output of which
# should be appended to $GITHUB_ENV.

# It takes one optional argument, which is usually set to the Github branch. It will look in $ENVDIR for a file matching this
# name, falling back to 'default' if the file is not found.

# It will echo back this file, expanding any variables using environment variables that are set.
# As a special case, it will set DX_ENVIRONMENT to the name of the file passed in.


ENVDIR=.github/workflows/env

if ! [[ -f "$ENVDIR/$1" ]]; then
  envfile=$ENVDIR/default
else
  envfile=$ENVDIR/$1
fi

while read -r line; do
  eval echo "$line"
done < "$envfile"

echo "DX_ENVIRONMENT=${1//\//-}"
echo "BRANCH=$1"
