`dx function`
=============

Runtime pluggable code with data/event specific triggers.

* [`dx function dev`](#dx-function-dev)
* [`dx function dev-server`](#dx-function-dev-server)
* [`dx function exec NAME`](#dx-function-exec-name)
* [`dx function list`](#dx-function-list)
* [`dx function logs NAME`](#dx-function-logs-name)

## `dx function dev`

Functions development server.

```
USAGE
  $ dx function dev [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent] [--timeout
    <value>] [--no-wait] [--require <value>] [--baseDir <value>] [--manifest <value>] [--reload]

FLAGS
  -v, --verbose         Verbose output
  --baseDir=<value>     Base directory for function handlers.
  --config=path         [default: /Users/nf/.config/dx/profile/default.yml] Config file.
  --dry-run             Dry run.
  --json                Output as JSON.
  --manifest=<value>    Functions manifest file.
  --no-agent            Run command without using or starting agent.
  --no-wait             Do not wait for space to be ready.
  --profile=<value>     [default: default] User profile.
  --reload              Reload functions on change.
  --require=<value>...  [default: ts-node/register]
  --timeout=<value>     [default: 60000] Timeout (ms).

DESCRIPTION
  Functions development server.

ALIASES
  $ dx function dev-server

EXAMPLES
  Run with TypeScript support.

    $ dx function dev -r ts-node/register --verbose
```

## `dx function dev-server`

Functions development server.

```
USAGE
  $ dx function dev-server [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent] [--timeout
    <value>] [--no-wait] [--require <value>] [--baseDir <value>] [--manifest <value>] [--reload]

FLAGS
  -v, --verbose         Verbose output
  --baseDir=<value>     Base directory for function handlers.
  --config=path         [default: /Users/nf/.config/dx/profile/default.yml] Config file.
  --dry-run             Dry run.
  --json                Output as JSON.
  --manifest=<value>    Functions manifest file.
  --no-agent            Run command without using or starting agent.
  --no-wait             Do not wait for space to be ready.
  --profile=<value>     [default: default] User profile.
  --reload              Reload functions on change.
  --require=<value>...  [default: ts-node/register]
  --timeout=<value>     [default: 60000] Timeout (ms).

DESCRIPTION
  Functions development server.

ALIASES
  $ dx function dev-server

EXAMPLES
  Run with TypeScript support.

    $ dx function dev -r ts-node/register --verbose
```

## `dx function exec NAME`

Invoke function.

```
USAGE
  $ dx function exec NAME [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent] [--timeout
    <value>] [--no-wait]

ARGUMENTS
  NAME  Function name.

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
  Invoke function.
```

## `dx function list`

List functions.

```
USAGE
  $ dx function list [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent] [--timeout
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
  List functions.
```

## `dx function logs NAME`

Get function logs.

```
USAGE
  $ dx function logs NAME [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent] [--timeout
    <value>] [--no-wait]

ARGUMENTS
  NAME  Function name.

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
  Get function logs.
```
