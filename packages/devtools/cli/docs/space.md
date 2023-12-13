`dx space`
==========

A space is an instance of an ECHO database which can be replicated by a number of peers.

* [`dx space close [KEY]`](#dx-space-close-key)
* [`dx space create [NAME]`](#dx-space-create-name)
* [`dx space epoch [KEY]`](#dx-space-epoch-key)
* [`dx space info [KEY]`](#dx-space-info-key)
* [`dx space join`](#dx-space-join)
* [`dx space list`](#dx-space-list)
* [`dx space members [KEY]`](#dx-space-members-key)
* [`dx space open [KEY]`](#dx-space-open-key)
* [`dx space query [KEY]`](#dx-space-query-key)
* [`dx space share [KEY]`](#dx-space-share-key)

## `dx space close [KEY]`

Close space.

```
USAGE
  $ dx space close [KEY] [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent] [--timeout
    <value>] [--no-wait]

FLAGS
  -v, --verbose      Verbose output
  --config=path      [default: /Users/nf/.config/dx/profile/default.yml] Config file.
  --dry-run          Dry run.
  --json             Output as JSON.
  --no-agent         Run command without using or starting agent.
  --no-wait          Do not wait for space to be ready.
  --profile=<value>  [default: default] User profile.
  --timeout=<value>  [default: 60000] Timeout (ms).

DESCRIPTION
  Close space.
```

## `dx space create [NAME]`

Create space.

```
USAGE
  $ dx space create [NAME] [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent] [--timeout
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
  Create space.
```

## `dx space epoch [KEY]`

Create new epoch.

```
USAGE
  $ dx space epoch [KEY] [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent] [--timeout
    <value>] [--no-wait]

ARGUMENTS
  KEY  Space key head in hex.

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
  Create new epoch.
```

## `dx space info [KEY]`

Show space info.

```
USAGE
  $ dx space info [KEY] [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent] [--timeout
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
  Show space info.
```

## `dx space join`

Join space invitation

```
USAGE
  $ dx space join [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent] [--timeout
    <value>] [--no-wait] [--invitation <value>] [--secret <value>]

FLAGS
  -v, --verbose         Verbose output
  --config=path         [default: /Users/nf/.config/dx/profile/default.yml] Config file.
  --dry-run             Dry run.
  --invitation=<value>  Invitation code
  --json                Output as JSON.
  --no-agent            Run command without using or starting agent.
  --no-wait             Do not wait for space to be ready.
  --profile=<value>     [default: default] User profile.
  --secret=<value>      Invitation secret
  --timeout=<value>     [default: 60000] Timeout (ms).

DESCRIPTION
  Join space invitation
```

## `dx space list`

List spaces.

```
USAGE
  $ dx space list [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent] [--timeout
    <value>] [--no-wait] [--columns <value> | -x] [--sort <value>] [--filter <value>] [--output csv|json|yaml |  |
    [--csv | --no-truncate]] [--no-header | ] [--live]

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
  --timeout=<value>  [default: 60000] Timeout (ms).

DESCRIPTION
  List spaces.
```

## `dx space members [KEY]`

List space members.

```
USAGE
  $ dx space members [KEY] [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent] [--timeout
    <value>] [--no-wait] [--columns <value> | -x] [--sort <value>] [--filter <value>] [--output csv|json|yaml |  |
    [--csv | --no-truncate]] [--no-header | ]

ARGUMENTS
  KEY  Space key head in hex.

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
  List space members.
```

## `dx space open [KEY]`

Open space.

```
USAGE
  $ dx space open [KEY] [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent] [--timeout
    <value>] [--no-wait]

FLAGS
  -v, --verbose      Verbose output
  --config=path      [default: /Users/nf/.config/dx/profile/default.yml] Config file.
  --dry-run          Dry run.
  --json             Output as JSON.
  --no-agent         Run command without using or starting agent.
  --no-wait          Do not wait for space to be ready.
  --profile=<value>  [default: default] User profile.
  --timeout=<value>  [default: 60000] Timeout (ms).

DESCRIPTION
  Open space.
```

## `dx space query [KEY]`

Query database.

```
USAGE
  $ dx space query [KEY] [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent] [--timeout
    <value>] [--no-wait]

ARGUMENTS
  KEY  Space key head in hex.

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
  Query database.
```

## `dx space share [KEY]`

Create space invitation.

```
USAGE
  $ dx space share [KEY] [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent] [--timeout
    <value>] [--no-wait] [--multiple] [--no-auth]

ARGUMENTS
  KEY  Space key head in hex.

FLAGS
  -v, --verbose      Verbose output
  --config=path      [default: /Users/nf/.config/dx/profile/default.yml] Config file.
  --dry-run          Dry run.
  --json             Output as JSON.
  --multiple         Multiple use.
  --no-agent         Run command without using or starting agent.
  --no-auth          Skip authentication challenge.
  --no-wait          Do not wait for space to be ready.
  --profile=<value>  [default: default] User profile.
  --timeout=<value>  [default: 5000] Timeout in milliseconds.

DESCRIPTION
  Create space invitation.
```
