#!/usr/bin/env bash
#
# Copyright 2026 DXOS.org
#
# Tests for the SessionStart environment-inventory hook. Run it by hand:
#
#   bash .claude/scripts/env-inventory.test.sh
#
# The hook runs in a child shell with a synthetic environment, so the assertions
# do not depend on which credentials the machine running them happens to carry —
# and the leak test can use a value it fully controls.

set -uo pipefail

repo=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
hook="$repo/.claude/hooks/env-inventory.sh"

pass=0
fail=0

check() {
  local label=$1 expected=$2 actual=$3
  if [ "$expected" = "$actual" ]; then
    printf 'PASS  %s\n' "$label"
    pass=$((pass + 1))
  else
    printf 'FAIL  %s\n        expected: %s\n        actual:   %s\n' "$label" "$expected" "$actual"
    fail=$((fail + 1))
  fi
}

# A fixed environment, so an assertion cannot pass or fail on the host's own variables. The secret
# value is distinctive enough that finding it anywhere in the output can only mean a leak.
secret='s3cr3t-must-not-appear-abcxyz'
inventory=$(
  env -i \
    PATH="$PATH" HOME="$HOME" \
    FIXTURE_API_TOKEN="$secret" \
    DX_PROJECT_BACKEND=registry \
    PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
    GIT_CONFIG_KEY_0=url.https://github.com/.insteadOf \
    MAX_THINKING_TOKENS=31999 \
    bash "$hook" <<< '{"hook_event_name":"SessionStart"}'
)

has() { printf '%s\n' "$inventory" | grep -qF "$1" && printf 'yes' || printf 'no'; }

# The invariant the hook exists to hold: a name is reported, its value never is.
check 'credential name is reported' yes "$(has 'FIXTURE_API_TOKEN')"
check 'credential VALUE is not reported' no "$(has "$secret")"

check 'tooling variable is reported' yes "$(has 'DX_PROJECT_BACKEND')"

# `_PAT` unanchored matches `_PATH`, which filed every browser and CA-bundle path as a credential.
check 'a _PATH name is not called a credential' yes \
  "$(printf '%s\n' "$inventory" | sed -n '/Tooling/,$p' | grep -qF 'PLAYWRIGHT_BROWSERS_PATH' && printf 'yes' || printf 'no')"

# Names the secret pattern claims but which hold nothing secret.
check 'git config plumbing is excluded' no "$(has 'GIT_CONFIG_KEY_0')"
check 'a token budget is excluded' no "$(has 'MAX_THINKING_TOKENS')"

# A value containing a newline must not be able to forge an entry; `compgen -e` lists names only.
forged=$(
  env -i PATH="$PATH" HOME="$HOME" \
    DECOY="line1
FORGED_API_KEY=anything" \
    bash "$hook" <<< '{"hook_event_name":"SessionStart"}'
)
check 'a newline in a value cannot forge an entry' no \
  "$(printf '%s\n' "$forged" | grep -qF 'FORGED_API_KEY' && printf 'yes' || printf 'no')"

printf '\n%d passed, %d failed\n' "$pass" "$fail"
[ "$fail" -eq 0 ]
