# Source into current shell via: `. ./scripts/dev.sh`

export CLI_ROOT="$(git rev-parse --show-toplevel)/packages/devtools/cli"
export DX_CLI="$CLI_ROOT/bin/dev.js"

function dx() {
  pushd $CLI_ROOT > /dev/null
  cleanup() {
    popd > /dev/null
  }
  trap cleanup EXIT

  $DX_CLI $@
}