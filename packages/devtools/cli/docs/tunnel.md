`dx tunnel`
===========

Enable or disable tunnel.

* [`dx tunnel COMMAND`](#dx-tunnel-command)
* [`dx tunnel list`](#dx-tunnel-list)

## `dx tunnel COMMAND`

Enable or disable tunnel.

```
USAGE
  $ dx tunnel COMMAND [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent] [--timeout
    <value>] [--no-wait] [--name <value>]

ARGUMENTS
  COMMAND  Start.

FLAGS
  -v, --verbose      Verbose output
  --config=path      [default: /Users/nf/.config/dx/profile/default.yml] Config file.
  --dry-run          Dry run.
  --json             Output as JSON.
  --name=<value>     [default: river-ceiling-ceiling-mobile] Tunnel name
  --no-agent         Run command without using or starting agent.
  --no-wait          Do not wait for space to be ready.
  --profile=<value>  [default: default] User profile.
  --timeout=<value>  [default: 60000] Timeout (ms).

DESCRIPTION
  Enable or disable tunnel.
```

## `dx tunnel list`

List tunnels.

```
USAGE
  $ dx tunnel list [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent] [--timeout
    <value>] [--no-wait]

FLAGS
  -v, --verbose      Verbose output
  --config=path      [default: /Users/nf/.config/dx/profile/default.yml] Config file.
  --dry-run          Dry run.
  --no-agent         Run command without using or starting agent.
  --no-wait          Do not wait for space to be ready.
  --profile=<value>  [default: default] User profile.
  --timeout=<value>  [default: 60000] Timeout (ms).

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  List tunnels.
```
