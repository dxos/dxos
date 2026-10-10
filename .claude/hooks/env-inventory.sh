#!/usr/bin/env bash
#
# Copyright 2026 DXOS.org
#
# SessionStart hook: tell the agent WHICH credentials and tool settings this environment carries.
#
# Capability is invisible otherwise. An agent cannot see the environment block, so it either
# assumes a credential is absent and reports a task impossible (the `op` case: the sandbox has
# carried OP_SERVICE_ACCOUNT_TOKEN all along), or probes for one credential at a time against a
# permission classifier that reads repeated credential reads as exfiltration. One name-only
# inventory up front replaces both.
#
# NAMES ONLY, NEVER VALUES. A name says a capability exists; the value is the capability itself,
# and printing it into the transcript would persist a secret that a file could have held instead
# (AGENTS.md, "Handing an agent a credential"). The agent passes these to child processes through
# the environment it already has; it never needs to read one to use one.

set -euo pipefail

# `compgen -e` lists exported NAMES, so a value containing a newline cannot forge a line here —
# which `env | cut -d= -f1` would happily do.
names=$(compgen -e | sort)

# Anything whose name claims to hold a secret. Deliberately broad: a false positive costs one
# line, while a miss is the failure mode this hook exists to prevent. `_PAT` is anchored because
# bare `_PAT` also matches `_PATH`, which listed every browser and CA-bundle path as a credential.
secretish='(TOKEN|KEY|SECRET|PASSWORD|PASSWD|CREDENTIAL|AUTH|APIKEY|_PAT($|_))'

# Names the pattern above claims but which hold no secret: git's config plumbing, a token BUDGET
# rather than a token, and harness bookkeeping. Listing them as credentials invites the agent to
# go looking for an access it does not have.
notsecret='^(GIT_CONFIG_KEY_|MAX_THINKING_TOKENS$|CCR_)'

# Settings that change how the repo's own tooling behaves, and which the agent is expected to
# honour rather than rediscover. `CLAUDE_*` is NOT a prefix here: the harness exports ~60 of its
# own internals, which bury the handful of lines that carry information.
toolish='^(DX_|MOON_|PROTO_|PNPM_|LOG_|VITE_|WORKER_ENV|NODE_OPTIONS|NODE_EXTRA_CA_CERTS|CI$|HTTPS?_PROXY|NO_PROXY|CLAUDE_CODE_REMOTE$|PLAYWRIGHT_)'

# $2 selects, optional $3 excludes — so a name already reported as a credential is not repeated
# under tooling, where it would read as a second, separate variable.
emit() {
  local pattern=$1 exclude=${2:-} found=0
  while IFS= read -r name; do
    [ -n "$name" ] || continue
    [ -n "$exclude" ] && printf '%s\n' "$name" | grep -qE "$exclude" && continue
    printf '  - %s\n' "$name"
    found=1
  done < <(printf '%s\n' "$names" | grep -E "$pattern" || true)
  return $((1 - found))
}

printf 'ENVIRONMENT INVENTORY (names only — values are NOT shown and must never be printed)\n\n'

printf 'Credentials present (use via the environment; never echo, log, or commit a value):\n'
if ! emit "$secretish" "$notsecret"; then
  printf '  (none)\n'
fi

printf '\nTooling/config variables set:\n'
if ! emit "$toolish" "$secretish"; then
  printf '  (none)\n'
fi

printf '\nTotal exported variables: %s. ' "$(printf '%s\n' "$names" | grep -c . || true)"
printf 'A name listed above means that capability is available —\n'
printf 'do not report it missing without trying it, and do not probe for it by printing values.\n'
