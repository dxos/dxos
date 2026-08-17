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

# Expands `${VAR}` references and strips the quotes around a value, without ever re-parsing the line as
# shell. This was `eval echo "$line"`, which would execute a command substitution written into an env
# file; those files are repo-controlled, but a value is data and should not be able to run on the runner.
# Sets `expanded_line` rather than printing, so an unset reference can exit the script — inside `$(...)`
# it would only have exited the subshell and the deploy would have continued with a missing variable.
expand_line() {
  local line=$1

  # A `#` line produced nothing under `eval echo`, since the shell treated it as a comment.
  if [[ $line =~ ^[[:space:]]*# ]]; then
    expanded_line=''
    return
  fi

  local out='' rest=$line name
  while [[ $rest =~ ^([^$]*)\$\{([A-Za-z_][A-Za-z0-9_]*)\}(.*)$ ]]; do
    name=${BASH_REMATCH[2]}
    if [[ -z ${!name+set} ]]; then
      echo "::error::populate-env: $envfile references $name, which is not set" >&2
      exit 1
    fi
    out+="${BASH_REMATCH[1]}${!name}"
    rest=${BASH_REMATCH[3]}
  done
  out+=$rest

  # `KEY="value"` -> `KEY=value`, matching the quote removal `eval echo` performed.
  if [[ $out =~ ^([A-Za-z_][A-Za-z0-9_]*)=\"(.*)\"$ ]]; then
    out="${BASH_REMATCH[1]}=${BASH_REMATCH[2]}"
  fi

  expanded_line=$out
}

# `|| [[ -n "$line" ]]` is load-bearing: `read` returns non-zero on a final line with no terminating
# newline, so a bare `while read` silently drops it. That dropped `DX_EDGE_BASE_URL` — the last line of
# the old `main` env file — and the deploy fell back to dx.yml's default EDGE instead of the one the
# environment asked for, with nothing in the log to say so.
expanded=""
expanded_line=""
while read -r line || [[ -n "$line" ]]; do
  expand_line "$line"
  expanded+="$expanded_line"$'\n'
done < "$envfile"

printf '%s' "$expanded"
echo "DX_ENVIRONMENT=${1//\//-}"
echo "BRANCH=$1"

# Names only, to stderr so it stays out of $GITHUB_ENV — the values are secrets, but "which overrides did
# this deploy actually apply?" should be answerable from the run log without decompiling the bundle.
{
  echo "populate-env: $envfile ->"
  printf '%s' "$expanded" | sed -n 's/^\([A-Za-z_][A-Za-z0-9_]*\)=.*/  \1/p'
  echo "  DX_ENVIRONMENT"
  echo "  BRANCH"
} >&2
