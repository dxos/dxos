`dx device`
===========

Devices in your HALO.

* [`dx device info`](#dx-device-info)
* [`dx device list`](#dx-device-list)

## `dx device info`

Show device info.

```
USAGE
  $ dx device info [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent] [--timeout
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
  Show device info.
```

## `dx device list`

Show device info.

```
USAGE
  $ dx device list [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent] [--timeout
    <value>] [--no-wait] [--columns <value> | -x] [--sort <value>] [--filter <value>] [--output csv|json|yaml |  |
    [--csv | --no-truncate]] [--no-header | ]

FLAGS
  -v, --verbose      Verbose output
  -x, --extended     show extra columns
  --columns=<value>  only show provided columns (comma-separated)
  --config=path      [default: /Users/nf/.config/dx/profile/default.yml] Config file.
  --csv              output is csv format [alias: --output=csv]
  --dry-run          Dry run.
  --filter=<value>   filter property by partial string matching, ex: name=foo
  --json             Output as JSON.
  --no-agent         Run command without using or starting agent.
  --no-header        hide table header from output
  --no-truncate      do not truncate output to fit screen
  --no-wait          Do not wait for space to be ready.
  --output=<option>  output in a more machine friendly format
                     <options: csv|json|yaml>
  --profile=<value>  [default: default] User profile.
  --sort=<value>     property to sort by (prepend '-' for descending)
  --timeout=<value>  [default: 60000] Timeout (ms).

DESCRIPTION
  Show device info.
```
