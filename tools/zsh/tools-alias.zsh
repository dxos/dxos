#
# DXOS shell aliases
#

#
# Jump to folder within monorepo
# https://github.com/dmaretskyi/monorepo-cd
# e.g., `m client`, `m /`
#
eval "$(monorepo-cd --init m)"

#
# Runs Nx command from repo root
# pnpm nx run-many --target=build
# pnpm nx build <target> --watch
#
alias px="pnpm -w nx"

#
# Runs Nx command in the current directory.
# e.g., `p build`
#
function p () {
  px $1 "${PWD##*/}" "$@"
}

#
# Runs Nx command skipping the cache.
# e.g., `p test`
#
function pc () {
  p "$@" "${RANDOM}"
}

#
# Run everything (from root).
#
alias ci="px run-many --target build && px run-many --target test && px run-many --target lint"

#
# Clean and build everything (frequently added clean-up).
#
alias fak="git pull && git clean -xdf -e .idea && pnpm i && px run-many --target build"
