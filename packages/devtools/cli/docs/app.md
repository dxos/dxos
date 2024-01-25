`dx app`
========

Control apps that are published to KUBE specified in DXOS config.

* [`dx app create NAME`](#dx-app-create-name)
* [`dx app list`](#dx-app-list)
* [`dx app open URL`](#dx-app-open-url)
* [`dx app publish`](#dx-app-publish)

## `dx app create NAME`

Manage applications.

```
USAGE
  $ dx app create NAME [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent] [--timeout
    <value>] [--no-wait] [--tag <value>] [-t hello|bare|tasks] [-i]

ARGUMENTS
  NAME  App name.

FLAGS
  -i, --interactive        Customize app template options via interactive prompt.
  -t, --template=<option>  [default: hello] Template to use when creating the project.
                           <options: hello|bare|tasks>
  -v, --verbose            Verbose output
  --config=path            [default: /Users/nf/.config/dx/profile/default.yml] Config file.
  --dry-run                Dry run.
  --json                   Output as JSON.
  --no-agent               Run command without using or starting agent.
  --no-wait                Do not wait for space to be ready.
  --profile=<value>        [default: default] User profile.
  --tag=<value>            Git tag or branch of the DXOS repo to checkout.
  --timeout=<value>        [default: 60000] Timeout (ms).

DESCRIPTION
  Manage applications.
```

## `dx app list`

List apps.

```
USAGE
  $ dx app list [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent] [--timeout
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
  List apps.
```

## `dx app open URL`

Opens app with provided url and process device invitation.

```
USAGE
  $ dx app open URL [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent] [--timeout
    <value>] [--no-wait] [--instances <value>] [--invite]

ARGUMENTS
  URL  App URL.

FLAGS
  -v, --verbose        Verbose output
  --config=path        [default: /Users/nf/.config/dx/profile/default.yml] Config file.
  --dry-run            Dry run.
  --instances=<value>  [default: 1] Amount of test instances.
  --invite             If `true` proceed device invitation for all instances.
  --no-agent           Run command without using or starting agent.
  --no-wait            Do not wait for space to be ready.
  --profile=<value>    [default: default] User profile.
  --timeout=<value>    [default: 60000] Timeout (ms).

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Opens app with provided url and process device invitation.
```

## `dx app publish`

Publish apps.

```
USAGE
  $ dx app publish [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent] [--timeout
    <value>] [--no-wait] [--configPath <value>] [--accessToken <value>] [--skipExisting] [--version <value>]

FLAGS
  -v, --verbose          Verbose output
  --accessToken=<value>  Access token for publishing.
  --config=path          [default: /Users/nf/.config/dx/profile/default.yml] Config file.
  --configPath=<value>   Path to dx.yml
  --dry-run              Dry run.
  --json                 Output as JSON.
  --no-agent             Run command without using or starting agent.
  --no-wait              Do not wait for space to be ready.
  --profile=<value>      [default: default] User profile.
  --skipExisting         Do not update content on KUBE if version already exists.
  --timeout=<value>      [default: 60000] Timeout (ms).
  --version=<value>      Version of modules to publish.

DESCRIPTION
  Publish apps.
```
