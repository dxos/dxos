# Source into current shell via: `. ./scripts/dev.sh`

export CLI_ROOT="$(git rev-parse --show-toplevel)/packages/devtools/cli"
export DX_CLI="$CLI_ROOT/bin/dev.js"

function dx() {
  if [[ "$(pwd)" != "$CLI_ROOT" ]]; then
    pushd $CLI_ROOT > /dev/null
    cleanup() {
      popd > /dev/null
    }
    trap cleanup EXIT
  fi

  $DX_CLI $@
}