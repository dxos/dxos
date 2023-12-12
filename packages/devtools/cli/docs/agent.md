`dx agent`
==========

Long-running agent extended with plugins (e.g., functions, search, epoch management).

* [`dx agent list`](#dx-agent-list)
* [`dx agent restart`](#dx-agent-restart)
* [`dx agent start`](#dx-agent-start)
* [`dx agent stop`](#dx-agent-stop)

## `dx agent list`

List agents.

```
USAGE
  $ dx agent list [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent] [--timeout
    <value>] [--no-wait] [--columns <value> | -x] [--sort <value>] [--filter <value>] [--output csv|json|yaml |  |
    [--csv | --no-truncate]] [--no-header | ] [--live] [--system]

FLAGS
  -v, --verbose      Verbose output
  -x, --extended     show extra columns
  --columns=<value>  only show provided columns (comma-separated)
  --config=path      [default: /Users/nf/.config/dx/profile/default.yml] Config file.
  --csv              output is csv format [alias: --output=csv]
  --dry-run          Dry run.
  --filter=<value>   filter property by partial string matching, ex: name=foo
  --json             Output as JSON.
  --live             Live update.
  --no-agent         Run command without using or starting agent.
  --no-header        hide table header from output
  --no-truncate      do not truncate output to fit screen
  --no-wait          Do not wait for space to be ready.
  --output=<option>  output in a more machine friendly format
                     <options: csv|json|yaml>
  --profile=<value>  [default: default] User profile.
  --sort=<value>     property to sort by (prepend '-' for descending)
  --system           Run as system daemon.
  --timeout=<value>  [default: 60000] Timeout (ms).

DESCRIPTION
  List agents.
```

## `dx agent restart`

Restart agent daemon.

```
USAGE
  $ dx agent restart [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent] [--timeout
    <value>] [--no-wait] [--force] [--system]

FLAGS
  -v, --verbose      Verbose output
  --config=path      [default: /Users/nf/.config/dx/profile/default.yml] Config file.
  --dry-run          Dry run.
  --force            Force restart.
  --json             Output as JSON.
  --no-agent         Run command without using or starting agent.
  --no-wait          Do not wait for space to be ready.
  --profile=<value>  [default: default] User profile.
  --system           Run as system daemon.
  --timeout=<value>  [default: 60000] Timeout (ms).

DESCRIPTION
  Restart agent daemon.
```

## `dx agent start`

Starts the agent.

```
USAGE
  $ dx agent start [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent] [--timeout
    <value>] [--no-wait] [-f] [--system] [--ws <value>] [--metrics]

FLAGS
  -f, --foreground   Run in foreground.
  -v, --verbose      Verbose output
  --config=path      [default: /Users/nf/.config/dx/profile/default.yml] Config file.
  --dry-run          Dry run.
  --json             Output as JSON.
  --metrics          Start metrics recording.
  --no-agent         Run command without using or starting agent.
  --no-wait          Do not wait for space to be ready.
  --profile=<value>  [default: default] User profile.
  --system           Run as system daemon.
  --timeout=<value>  [default: 60000] Timeout (ms).
  --ws=port          Expose web socket port.

DESCRIPTION
  Starts the agent.

EXAMPLES
  Run with .

    $ dx agent start -f --ws=5001
```

## `dx agent stop`

Stop agent daemon.

```
USAGE
  $ dx agent stop [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent] [--timeout
    <value>] [--no-wait] [--all] [--force] [--system]

FLAGS
  -v, --verbose      Verbose output
  --all              Stop all agents.
  --config=path      [default: /Users/nf/.config/dx/profile/default.yml] Config file.
  --dry-run          Dry run.
  --force            Force stop.
  --json             Output as JSON.
  --no-agent         Run command without using or starting agent.
  --no-wait          Do not wait for space to be ready.
  --profile=<value>  [default: default] User profile.
  --system           Run as system daemon.
  --timeout=<value>  [default: 60000] Timeout (ms).

DESCRIPTION
  Stop agent daemon.
```
