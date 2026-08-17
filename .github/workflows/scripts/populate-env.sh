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

# `|| [[ -n "$line" ]]` is load-bearing: `read` returns non-zero on a final line with no terminating
# newline, so a bare `while read` silently drops it. That dropped `DX_EDGE_BASE_URL` — the last line of
# the old `main` env file — and the deploy fell back to dx.yml's default EDGE instead of the one the
# environment asked for, with nothing in the log to say so.
expanded=""
while read -r line || [[ -n "$line" ]]; do
  expanded+="$(eval echo "$line")"$'\n'
done < "$envfile"

printf '%s' "$expanded"
echo "DX_ENVIRONMENT=${1//\//-}"
echo "BRANCH=$1"

# Names only, to stderr so it stays out of $GITHUB_ENV — the values are secrets, but "which overrides did
# this deploy actually apply?" should be answerable from the run log without decompiling the bundle.
# Read from the captured expansion rather than re-running the loop: `eval` must happen exactly once, or a
# file whose value contained a substitution would run it twice.
{
  echo "populate-env: $envfile ->"
  printf '%s' "$expanded" | sed -n 's/^\([A-Za-z_][A-Za-z0-9_]*\)=.*/  \1/p'
  echo "  DX_ENVIRONMENT"
  echo "  BRANCH"
} >&2
