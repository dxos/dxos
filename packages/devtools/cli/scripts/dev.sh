# Source into current shell via: `. ./scripts/dev.sh`

export DX_CLI="$(git rev-parse --show-toplevel)/packages/devtools/cli/bin/dev"
alias dx="$DX_CLI"
