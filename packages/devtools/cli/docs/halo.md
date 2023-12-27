`dx halo`
=========

HALO is a system of components for implementing decentralized identity designed around privacy, security, and collaboration requirements.

* [`dx halo create DISPLAYNAME`](#dx-halo-create-displayname)
* [`dx halo credential add [CREDENTIAL]`](#dx-halo-credential-add-credential)
* [`dx halo credential list`](#dx-halo-credential-list)
* [`dx halo identity`](#dx-halo-identity)
* [`dx halo join`](#dx-halo-join)
* [`dx halo share`](#dx-halo-share)

## `dx halo create DISPLAYNAME`

Create HALO.

```
USAGE
  $ dx halo create DISPLAYNAME [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent]
    [--timeout <value>] [--no-wait]

ARGUMENTS
  DISPLAYNAME  Display name

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
  Create HALO.
```

## `dx halo credential add [CREDENTIAL]`

Import credential into HALO.

```
USAGE
  $ dx halo credential add [CREDENTIAL] [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent]
    [--timeout <value>] [--no-wait]

ARGUMENTS
  CREDENTIAL  credential

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
  Import credential into HALO.
```

## `dx halo credential list`

List HALO credentials.

```
USAGE
  $ dx halo credential list [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent] [--timeout
    <value>] [--no-wait] [--columns <value> | -x] [--sort <value>] [--filter <value>] [--output csv|json|yaml |  |
    [--csv | --no-truncate]] [--no-header | ] [--type <value>]

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
  --type=<value>     Type

DESCRIPTION
  List HALO credentials.
```

## `dx halo identity`

Show HALO identity.

```
USAGE
  $ dx halo identity [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent] [--timeout
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
  Show HALO identity.
```

## `dx halo join`

Join HALO (device) invitation.

```
USAGE
  $ dx halo join [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent] [--timeout
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
  Join HALO (device) invitation.
```

## `dx halo share`

Create HALO (device) invitation.

```
USAGE
  $ dx halo share [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent] [--timeout
    <value>] [--no-wait] [--noCode]

FLAGS
  -v, --verbose      Verbose output
  --config=path      [default: /Users/nf/.config/dx/profile/default.yml] Config file.
  --dry-run          Dry run.
  --no-agent         Run command without using or starting agent.
  --no-wait          Do not wait for space to be ready.
  --noCode           Flag that specifies if secret auth code is not required
  --profile=<value>  [default: default] User profile.
  --timeout=<value>  [default: 60000] Timeout (ms).

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Create HALO (device) invitation.
```
