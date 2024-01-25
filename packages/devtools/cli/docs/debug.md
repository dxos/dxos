`dx debug`
==========

Commands to help debug stuff (contains data generation to imitate high load, database metrics, etc.).

* [`dx debug diagnostics`](#dx-debug-diagnostics)
* [`dx debug generate [KEY]`](#dx-debug-generate-key)
* [`dx debug metrics [COMMAND]`](#dx-debug-metrics-command)
* [`dx debug status`](#dx-debug-status)

## `dx debug diagnostics`

Create diagnostics report.

```
USAGE
  $ dx debug diagnostics [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent] [--timeout
    <value>] [--no-wait] [--humanize] [--truncate]

FLAGS
  -v, --verbose      Verbose output
  --config=path      [default: /Users/nf/.config/dx/profile/default.yml] Config file.
  --dry-run          Dry run.
  --humanize         Humanize keys.
  --json             Output as JSON.
  --no-agent         Run command without using or starting agent.
  --no-wait          Do not wait for space to be ready.
  --profile=<value>  [default: default] User profile.
  --timeout=<value>  [default: 60000] Timeout (ms).
  --truncate         Truncate keys.

DESCRIPTION
  Create diagnostics report.

EXAMPLES
  Inspect diagnostics.

    $ dx debug diagnostics --json --truncate | jq -r '.metrics'

  Upload diagnostics to GitHub.

    $ dx debug diagnostics --json --truncate | gh gist create --filename diagnostics.json
```

## `dx debug generate [KEY]`

Generate test data.

```
USAGE
  $ dx debug generate [KEY] [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent] [--timeout
    <value>] [--no-wait] [--interval <value>] [--jitter <value>] [--objects <value>] [--mutations <value>] [--epoch
    <value>]

ARGUMENTS
  KEY  Space key head in hex.

FLAGS
  -v, --verbose        Verbose output
  --config=path        [default: /Users/nf/.config/dx/profile/default.yml] Config file.
  --dry-run            Dry run.
  --epoch=<value>      Number of mutations per epoch.
  --interval=<value>   Interval between mutations (ms).
  --jitter=<value>     Interval variance (ms).
  --json               Output as JSON.
  --mutations=<value>  Number of mutations.
  --no-agent           Run command without using or starting agent.
  --no-wait            Do not wait for space to be ready.
  --objects=<value>    Number of objects.
  --profile=<value>    [default: default] User profile.
  --timeout=<value>    [default: 60000] Timeout (ms).

DESCRIPTION
  Generate test data.
```

## `dx debug metrics [COMMAND]`

Control metrics.

```
USAGE
  $ dx debug metrics [COMMAND] [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent]
    [--timeout <value>] [--no-wait]

ARGUMENTS
  COMMAND  Control metrics recording.

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
  Control metrics.
```

## `dx debug status`

Display status.

```
USAGE
  $ dx debug status [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent] [--timeout
    <value>] [--no-wait] [--interval <value>]

FLAGS
  -v, --verbose       Verbose output
  --config=path       [default: /Users/nf/.config/dx/profile/default.yml] Config file.
  --dry-run           Dry run.
  --interval=<value>  [default: 1000] Update interval (ms).
  --json              Output as JSON.
  --no-agent          Run command without using or starting agent.
  --no-wait           Do not wait for space to be ready.
  --profile=<value>   [default: default] User profile.
  --timeout=<value>   [default: 60000] Timeout (ms).

DESCRIPTION
  Display status.
```
