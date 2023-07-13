# DX CLI

DXOS command line interface.

TODO(wittjosiah): Add oclif-specific linting rules.

# Development

Run the build script from the root directory.

```bash
$ nx run cli:build --watch=true
```

Run the CLI in the local directory.

```bash
$ export DX_CONFIG=./config/config.yml
$ ./bin/run config --json
```

# Usage

<!-- usage -->
```sh-session
$ npm install -g @dxos/cli
$ dx COMMAND
running command...
$ dx (--version)
@dxos/cli/0.1.51 darwin-arm64 node-v18.12.1
@dxos/cli/0.1.51 darwin-arm64 node-v18.14.2
$ dx --help [COMMAND]
USAGE
  $ dx COMMAND
...
```
<!-- usagestop -->

# Commands

<!-- commands -->
- [DX CLI](#dx-cli)
- [Development](#development)
- [Usage](#usage)
- [Commands](#commands)
  - [`dx agent list`](#dx-agent-list)
  - [`dx agent restart`](#dx-agent-restart)
  - [`dx agent start`](#dx-agent-start)
  - [`dx agent stop`](#dx-agent-stop)
  - [`dx agent list`](#dx-agent-list-1)
  - [`dx agent restart`](#dx-agent-restart-1)
  - [`dx agent start`](#dx-agent-start-1)
  - [`dx agent stop`](#dx-agent-stop-1)
  - [`dx app create NAME`](#dx-app-create-name)
  - [`dx app list`](#dx-app-list)
  - [`dx app open URL`](#dx-app-open-url)
  - [`dx app open URL`](#dx-app-open-url-1)
  - [`dx app publish`](#dx-app-publish)
  - [`dx config`](#dx-config)
  - [`dx debug stats`](#dx-debug-stats)
  - [`dx device`](#dx-device)
  - [`dx device list`](#dx-device-list)
  - [`dx function dev`](#dx-function-dev)
  - [`dx function exec NAME`](#dx-function-exec-name)
  - [`dx function list`](#dx-function-list)
  - [`dx function logs NAME`](#dx-function-logs-name)
  - [`dx debug stats`](#dx-debug-stats-1)
  - [`dx device`](#dx-device-1)
  - [`dx device list`](#dx-device-list-1)
  - [`dx function exec NAME`](#dx-function-exec-name-1)
  - [`dx function list`](#dx-function-list-1)
  - [`dx function logs NAME`](#dx-function-logs-name-1)
  - [`dx halo`](#dx-halo)
  - [`dx halo create DISPLAYNAME`](#dx-halo-create-displayname)
  - [`dx halo create DISPLAYNAME`](#dx-halo-create-displayname-1)
  - [`dx halo credential add [CREDENTIAL]`](#dx-halo-credential-add-credential)
  - [`dx halo credential add [CREDENTIAL]`](#dx-halo-credential-add-credential-1)
  - [`dx halo credential list`](#dx-halo-credential-list)
  - [`dx halo join`](#dx-halo-join)
  - [`dx halo share`](#dx-halo-share)
  - [`dx help [COMMANDS]`](#dx-help-commands)
  - [`dx halo credential list`](#dx-halo-credential-list-1)
  - [`dx halo join`](#dx-halo-join-1)
  - [`dx halo share`](#dx-halo-share-1)
  - [`dx help [COMMANDS]`](#dx-help-commands-1)
  - [`dx kube auth`](#dx-kube-auth)
  - [`dx kube auth`](#dx-kube-auth-1)
  - [`dx kube deploy`](#dx-kube-deploy)
  - [`dx plugins`](#dx-plugins)
  - [`dx plugins:install PLUGIN...`](#dx-pluginsinstall-plugin)
  - [`dx plugins:inspect PLUGIN...`](#dx-pluginsinspect-plugin)
  - [`dx plugins:install PLUGIN...`](#dx-pluginsinstall-plugin-1)
  - [`dx plugins:link PLUGIN`](#dx-pluginslink-plugin)
  - [`dx plugins:uninstall PLUGIN...`](#dx-pluginsuninstall-plugin)
  - [`dx plugins:uninstall PLUGIN...`](#dx-pluginsuninstall-plugin-1)
  - [`dx plugins:uninstall PLUGIN...`](#dx-pluginsuninstall-plugin-2)
  - [`dx plugins update`](#dx-plugins-update)
  - [`dx reset`](#dx-reset)
  - [`dx shell`](#dx-shell)
  - [`dx space`](#dx-space)
  - [`dx space create [NAME]`](#dx-space-create-name)
  - [`dx space epoch [KEY]`](#dx-space-epoch-key)
  - [`dx space invite KEY`](#dx-space-invite-key)
  - [`dx space epoch [KEY]`](#dx-space-epoch-key-1)
  - [`dx space invite KEY`](#dx-space-invite-key-1)
  - [`dx space join`](#dx-space-join)
  - [`dx space list`](#dx-space-list)
  - [`dx space members [KEY]`](#dx-space-members-key)
  - [`dx tunnel list`](#dx-tunnel-list)
  - [`dx tunnel set`](#dx-tunnel-set)

## `dx agent list`

List agents.

```
USAGE
  $ dx agent list [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent] [--timeout <value>]

FLAGS
  -v, --verbose      Verbose output
  --config=<value>   [default: /Users/dmaretskyi/.config/dx/profile/default.yml] Config file.
  --dry-run          Dry run.
  --no-agent         Auto-start agent.
  --profile=<value>  [default: default] User profile.
  --timeout=<value>  [default: 30] Timeout in seconds.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  List agents.
```

## `dx agent restart`

Restart agent daemon.

```
USAGE
  $ dx agent restart [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent] [--timeout <value>]

FLAGS
  -v, --verbose      Verbose output
  --config=<value>   [default: /Users/dmaretskyi/.config/dx/profile/default.yml] Config file.
  --dry-run          Dry run.
  --no-agent         Auto-start agent.
  --profile=<value>  [default: default] User profile.
  --timeout=<value>  [default: 30] Timeout in seconds.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Restart agent daemon.
```

## `dx agent start`

Start agent daemon.

```
USAGE
  $ dx agent start [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent] [--timeout
    <value>] [-f] [--socket] [--web-socket <value>] [--http <value>] [--epoch <value>]

FLAGS
  -f, --foreground      Run in foreground
  -v, --verbose         Verbose output
  --config=<value>      [default: /Users/dmaretskyi/.config/dx/profile/default.yml] Config file.
  --dry-run             Dry run.
  --epoch=<value>       Manage epochs (set to "auto" or message count).
  --http=<value>        Expose HTTP proxy.
  --no-agent            Auto-start agent.
  --profile=<value>     [default: default] User profile.
  --socket              Expose socket.
  --timeout=<value>     [default: 30] Timeout in seconds.
  --web-socket=<value>  Expose web socket port.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Start agent daemon.
```

## `dx agent stop`

Stop agent daemon.

```
USAGE
  $ dx agent stop [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent] [--timeout <value>]

FLAGS
  -v, --verbose      Verbose output
  --config=<value>   [default: /Users/dmaretskyi/.config/dx/profile/default.yml] Config file.
  --dry-run          Dry run.
  --no-agent         Auto-start agent.
  --profile=<value>  [default: default] User profile.
  --timeout=<value>  [default: 30] Timeout in seconds.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Stop agent daemon.
```

## `dx agent list`

List agents.

```
USAGE
  $ dx agent list [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent] [--timeout <value>]

FLAGS
  -v, --verbose      Verbose output
  --config=<value>   [default: /Users/burdon/.config/dx/profile/default.yml] Config file.
  --dry-run          Dry run.
  --no-agent         Auto-start agent.
  --profile=<value>  [default: default] User profile.
  --timeout=<value>  [default: 30] Timeout in seconds.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  List agents.
```

## `dx agent restart`

Restart agent daemon.

```
USAGE
  $ dx agent restart [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent] [--timeout <value>]

FLAGS
  -v, --verbose      Verbose output
  --config=<value>   [default: /Users/burdon/.config/dx/profile/default.yml] Config file.
  --dry-run          Dry run.
  --no-agent         Auto-start agent.
  --profile=<value>  [default: default] User profile.
  --timeout=<value>  [default: 30] Timeout in seconds.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Restart agent daemon.
```

## `dx agent start`

Starts the agent.

```
USAGE
  $ dx agent start [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent] [--timeout
    <value>] [-f] [--web-socket <value>] [--echo <value>] [--monitor]

FLAGS
  -f, --foreground      Run in foreground.
  -v, --verbose         Verbose output
  --config=<value>      [default: /Users/burdon/.config/dx/profile/default.yml] Config file.
  --dry-run             Dry run.
  --echo=<value>        Expose ECHO REST API.
  --monitor             Run epoch monitoring.
  --no-agent            Auto-start agent.
  --profile=<value>     [default: default] User profile.
  --timeout=<value>     [default: 30] Timeout in seconds.
  --web-socket=<value>  Expose web socket port.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Starts the agent.
```

## `dx agent stop`

Stop agent daemon.

```
USAGE
  $ dx agent stop [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent] [--timeout <value>]

FLAGS
  -v, --verbose      Verbose output
  --config=<value>   [default: /Users/burdon/.config/dx/profile/default.yml] Config file.
  --dry-run          Dry run.
  --no-agent         Auto-start agent.
  --profile=<value>  [default: default] User profile.
  --timeout=<value>  [default: 30] Timeout in seconds.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Stop agent daemon.
```

## `dx app create NAME`

Manage applications.
Manage applications.

```
USAGE
  $ dx app create NAME [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent] [--timeout
    <value>] [--tag <value>] [-t hello|bare|tasks] [-i]
  $ dx app create NAME [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent] [--timeout
    <value>] [--tag <value>] [-t hello|bare|tasks] [-i]

ARGUMENTS
  NAME  App name.
  NAME  App name.

FLAGS
  -i, --interactive        Customize app template options via interactive prompt.
  -i, --interactive        Customize app template options via interactive prompt.
  -t, --template=<option>  [default: hello] Template to use when creating the project.
                           <options: hello|bare|tasks>
  -v, --verbose            Verbose output
  --config=<value>         [default: /Users/dmaretskyi/.config/dx/profile/default.yml] Config file.
  --dry-run                Dry run.
  --no-agent               Auto-start agent.
  --profile=<value>        [default: default] User profile.
  --config=<value>         [default: /Users/burdon/.config/dx/profile/default.yml] Config file.
  --dry-run                Dry run.
  --no-agent               Auto-start agent.
  --profile=<value>        [default: default] User profile.
  --tag=<value>            Git tag or branch of the DXOS repo to checkout.
  --timeout=<value>        [default: 30] Timeout in seconds.

GLOBAL FLAGS
  --json  Format output as json.
  --timeout=<value>        [default: 30] Timeout in seconds.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Manage applications.
  Manage applications.
```

## `dx app list`

List apps.

```
USAGE
  $ dx app list [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent] [--timeout <value>]
  $ dx app list [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent] [--timeout <value>]

FLAGS
  -v, --verbose      Verbose output
  --config=<value>   [default: /Users/dmaretskyi/.config/dx/profile/default.yml] Config file.
  --dry-run          Dry run.
  --no-agent         Auto-start agent.
  --profile=<value>  [default: default] User profile.
  --timeout=<value>  [default: 30] Timeout in seconds.
  -v, --verbose      Verbose output
  --config=<value>   [default: /Users/burdon/.config/dx/profile/default.yml] Config file.
  --dry-run          Dry run.
  --no-agent         Auto-start agent.
  --profile=<value>  [default: default] User profile.
  --timeout=<value>  [default: 30] Timeout in seconds.

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
    <value>] [--instances <value>] [--invite]

ARGUMENTS
  URL  App URL.

FLAGS
  -v, --verbose        Verbose output
  --config=<value>     [default: /Users/dmaretskyi/.config/dx/profile/default.yml] Config file.
  --dry-run            Dry run.
  --instances=<value>  [default: 1] Amount of test instances.
  --invite             If `true` proceed device invitation for all instances.
  --no-agent           Auto-start agent.
  --profile=<value>    [default: default] User profile.
  --timeout=<value>    [default: 30] Timeout in seconds.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Opens app with provided url and process device invitation.
```

## `dx app open URL`

Opens app with provided url and process device invitation.

```
USAGE
  $ dx app open URL [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent] [--timeout
    <value>] [--instances <value>] [--invite]

ARGUMENTS
  URL  App URL.

FLAGS
  -v, --verbose        Verbose output
  --config=<value>     [default: /Users/burdon/.config/dx/profile/default.yml] Config file.
  --dry-run            Dry run.
  --instances=<value>  [default: 1] Amount of test instances.
  --invite             If `true` proceed device invitation for all instances.
  --no-agent           Auto-start agent.
  --profile=<value>    [default: default] User profile.
  --timeout=<value>    [default: 30] Timeout in seconds.

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
    <value>] [--configPath <value>] [--accessToken <value>] [--skipExisting] [--version <value>]
  $ dx app publish [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent] [--timeout
    <value>] [--configPath <value>] [--accessToken <value>] [--skipExisting] [--version <value>]

FLAGS
  -v, --verbose          Verbose output
  --accessToken=<value>  Access token for publishing.
  --config=<value>       [default: /Users/dmaretskyi/.config/dx/profile/default.yml] Config file.
  -v, --verbose          Verbose output
  --accessToken=<value>  Access token for publishing.
  --config=<value>       [default: /Users/burdon/.config/dx/profile/default.yml] Config file.
  --configPath=<value>   Path to dx.yml
  --dry-run              Dry run.
  --no-agent             Auto-start agent.
  --profile=<value>      [default: default] User profile.
  --skipExisting         Do not update content on KUBE if version already exists.
  --timeout=<value>      [default: 30] Timeout in seconds.
  --version=<value>      Version of modules to publish.

GLOBAL FLAGS
  --json  Format output as json.
  --dry-run              Dry run.
  --no-agent             Auto-start agent.
  --profile=<value>      [default: default] User profile.
  --skipExisting         Do not update content on KUBE if version already exists.
  --timeout=<value>      [default: 30] Timeout in seconds.
  --version=<value>      Version of modules to publish.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Publish apps.
```

## `dx config`

Show config file.

```
USAGE
  $ dx config [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent] [--timeout <value>]
  $ dx config [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent] [--timeout <value>]

FLAGS
  -v, --verbose      Verbose output
  --config=<value>   [default: /Users/dmaretskyi/.config/dx/profile/default.yml] Config file.
  --dry-run          Dry run.
  --no-agent         Auto-start agent.
  --profile=<value>  [default: default] User profile.
  --timeout=<value>  [default: 30] Timeout in seconds.
  -v, --verbose      Verbose output
  --config=<value>   [default: /Users/burdon/.config/dx/profile/default.yml] Config file.
  --dry-run          Dry run.
  --no-agent         Auto-start agent.
  --profile=<value>  [default: default] User profile.
  --timeout=<value>  [default: 30] Timeout in seconds.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Show config file.
```

## `dx debug stats`

Output debug stats.

```
USAGE
  $ dx debug stats [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent] [--timeout
    <value>] [--humanize] [--truncate]

FLAGS
  -v, --verbose      Verbose output
  --config=<value>   [default: /Users/dmaretskyi/.config/dx/profile/default.yml] Config file.
  --dry-run          Dry run.
  --humanize         Humanized keys.
  --no-agent         Auto-start agent.
  --profile=<value>  [default: default] User profile.
  --timeout=<value>  [default: 30] Timeout in seconds.
  --truncate         Truncate keys.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Output debug stats.
```

## `dx device`

Show device info.

```
USAGE
  $ dx device [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent] [--timeout <value>]

FLAGS
  -v, --verbose      Verbose output
  --config=<value>   [default: /Users/dmaretskyi/.config/dx/profile/default.yml] Config file.
  --dry-run          Dry run.
  --no-agent         Auto-start agent.
  --profile=<value>  [default: default] User profile.
  --timeout=<value>  [default: 30] Timeout in seconds.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Show device info.
```

## `dx device list`

Show device info.

```
USAGE
  $ dx device list [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent] [--timeout <value>]

FLAGS
  -v, --verbose      Verbose output
  --config=<value>   [default: /Users/dmaretskyi/.config/dx/profile/default.yml] Config file.
  --dry-run          Dry run.
  --no-agent         Auto-start agent.
  --profile=<value>  [default: default] User profile.
  --timeout=<value>  [default: 30] Timeout in seconds.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Show device info.
```

## `dx function dev`

Functions dev server.

```
USAGE
  $ dx function dev [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent] [--timeout <value>]

FLAGS
  -v, --verbose      Verbose output
  --config=<value>   [default: /Users/dmaretskyi/.config/dx/profile/default.yml] Config file.
  --dry-run          Dry run.
  --no-agent         Auto-start agent.
  --profile=<value>  [default: default] User profile.
  --timeout=<value>  [default: 30] Timeout in seconds.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Functions dev server.
```

## `dx function exec NAME`

Invoke function.

```
USAGE
  $ dx function exec NAME [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent] [--timeout
    <value>]

ARGUMENTS
  NAME  Function name.

FLAGS
  -v, --verbose      Verbose output
  --config=<value>   [default: /Users/dmaretskyi/.config/dx/profile/default.yml] Config file.
  --dry-run          Dry run.
  --no-agent         Auto-start agent.
  --profile=<value>  [default: default] User profile.
  --timeout=<value>  [default: 30] Timeout in seconds.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Invoke function.
```

## `dx function list`

List functions.

```
USAGE
  $ dx function list [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent] [--timeout <value>]

FLAGS
  -v, --verbose      Verbose output
  --config=<value>   [default: /Users/dmaretskyi/.config/dx/profile/default.yml] Config file.
  --dry-run          Dry run.
  --no-agent         Auto-start agent.
  --profile=<value>  [default: default] User profile.
  --timeout=<value>  [default: 30] Timeout in seconds.

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
    <value>]

ARGUMENTS
  NAME  Function name.

FLAGS
  -v, --verbose      Verbose output
  --config=<value>   [default: /Users/dmaretskyi/.config/dx/profile/default.yml] Config file.
  --dry-run          Dry run.
  --no-agent         Auto-start agent.
  --profile=<value>  [default: default] User profile.
  --timeout=<value>  [default: 30] Timeout in seconds.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Get function logs.
```

## `dx debug stats`

Output debug stats.

```
USAGE
  $ dx debug stats [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent] [--timeout
    <value>] [--humanize] [--truncate]

FLAGS
  -v, --verbose      Verbose output
  --config=<value>   [default: /Users/burdon/.config/dx/profile/default.yml] Config file.
  --dry-run          Dry run.
  --humanize         Humanized keys.
  --no-agent         Auto-start agent.
  --profile=<value>  [default: default] User profile.
  --timeout=<value>  [default: 30] Timeout in seconds.
  --truncate         Truncate keys.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Output debug stats.
```

## `dx device`

Show device info.

```
USAGE
  $ dx device [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent] [--timeout <value>]

FLAGS
  -v, --verbose      Verbose output
  --config=<value>   [default: /Users/burdon/.config/dx/profile/default.yml] Config file.
  --dry-run          Dry run.
  --no-agent         Auto-start agent.
  --profile=<value>  [default: default] User profile.
  --timeout=<value>  [default: 30] Timeout in seconds.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Show device info.
```

## `dx device list`

Show device info.

```
USAGE
  $ dx device list [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent] [--timeout <value>]

FLAGS
  -v, --verbose      Verbose output
  --config=<value>   [default: /Users/burdon/.config/dx/profile/default.yml] Config file.
  --dry-run          Dry run.
  --no-agent         Auto-start agent.
  --profile=<value>  [default: default] User profile.
  --timeout=<value>  [default: 30] Timeout in seconds.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Show device info.
```

## `dx function exec NAME`

Invoke function.

```
USAGE
  $ dx function exec NAME [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent] [--timeout
    <value>]

ARGUMENTS
  NAME  Function name.

FLAGS
  -v, --verbose      Verbose output
  --config=<value>   [default: /Users/burdon/.config/dx/profile/default.yml] Config file.
  --dry-run          Dry run.
  --no-agent         Auto-start agent.
  --profile=<value>  [default: default] User profile.
  --timeout=<value>  [default: 30] Timeout in seconds.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Invoke function.
```

## `dx function list`

List functions.

```
USAGE
  $ dx function list [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent] [--timeout <value>]

FLAGS
  -v, --verbose      Verbose output
  --config=<value>   [default: /Users/burdon/.config/dx/profile/default.yml] Config file.
  --dry-run          Dry run.
  --no-agent         Auto-start agent.
  --profile=<value>  [default: default] User profile.
  --timeout=<value>  [default: 30] Timeout in seconds.

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
    <value>]

ARGUMENTS
  NAME  Function name.

FLAGS
  -v, --verbose      Verbose output
  --config=<value>   [default: /Users/burdon/.config/dx/profile/default.yml] Config file.
  --dry-run          Dry run.
  --no-agent         Auto-start agent.
  --profile=<value>  [default: default] User profile.
  --timeout=<value>  [default: 30] Timeout in seconds.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Get function logs.
```

## `dx halo`

Show HALO profile.

```
USAGE
  $ dx halo [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent] [--timeout <value>]
  $ dx halo [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent] [--timeout <value>]

FLAGS
  -v, --verbose      Verbose output
  --config=<value>   [default: /Users/dmaretskyi/.config/dx/profile/default.yml] Config file.
  --dry-run          Dry run.
  --no-agent         Auto-start agent.
  --profile=<value>  [default: default] User profile.
  --timeout=<value>  [default: 30] Timeout in seconds.
  -v, --verbose      Verbose output
  --config=<value>   [default: /Users/burdon/.config/dx/profile/default.yml] Config file.
  --dry-run          Dry run.
  --no-agent         Auto-start agent.
  --profile=<value>  [default: default] User profile.
  --timeout=<value>  [default: 30] Timeout in seconds.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Show HALO profile.
```

## `dx halo create DISPLAYNAME`
## `dx halo create DISPLAYNAME`

Create HALO.

```
USAGE
  $ dx halo create DISPLAYNAME [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent]
    [--timeout <value>]

ARGUMENTS
  DISPLAYNAME  Display name
  $ dx halo create DISPLAYNAME [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent]
    [--timeout <value>]

ARGUMENTS
  DISPLAYNAME  Display name

FLAGS
  -v, --verbose      Verbose output
  --config=<value>   [default: /Users/dmaretskyi/.config/dx/profile/default.yml] Config file.
  --dry-run          Dry run.
  --no-agent         Auto-start agent.
  --profile=<value>  [default: default] User profile.
  --timeout=<value>  [default: 30] Timeout in seconds.
  -v, --verbose      Verbose output
  --config=<value>   [default: /Users/burdon/.config/dx/profile/default.yml] Config file.
  --dry-run          Dry run.
  --no-agent         Auto-start agent.
  --profile=<value>  [default: default] User profile.
  --timeout=<value>  [default: 30] Timeout in seconds.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Create HALO.
```

## `dx halo credential add [CREDENTIAL]`
## `dx halo credential add [CREDENTIAL]`

Import credential into HALO.
Import credential into HALO.

```
USAGE
  $ dx halo credential add [CREDENTIAL] [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent]
    [--timeout <value>]

ARGUMENTS
  CREDENTIAL  credential
  $ dx halo credential add [CREDENTIAL] [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent]
    [--timeout <value>]

ARGUMENTS
  CREDENTIAL  credential

FLAGS
  -v, --verbose      Verbose output
  --config=<value>   [default: /Users/dmaretskyi/.config/dx/profile/default.yml] Config file.
  --dry-run          Dry run.
  --no-agent         Auto-start agent.
  --profile=<value>  [default: default] User profile.
  --timeout=<value>  [default: 30] Timeout in seconds.
  -v, --verbose      Verbose output
  --config=<value>   [default: /Users/burdon/.config/dx/profile/default.yml] Config file.
  --dry-run          Dry run.
  --no-agent         Auto-start agent.
  --profile=<value>  [default: default] User profile.
  --timeout=<value>  [default: 30] Timeout in seconds.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Import credential into HALO.
  Import credential into HALO.
```

## `dx halo credential list`

List HALO credentials.

```
USAGE
  $ dx halo credential list [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent] [--timeout
    <value>] [--type <value>]

FLAGS
  -v, --verbose      Verbose output
  --config=<value>   [default: /Users/dmaretskyi/.config/dx/profile/default.yml] Config file.
  --dry-run          Dry run.
  --no-agent         Auto-start agent.
  --profile=<value>  [default: default] User profile.
  --timeout=<value>  [default: 30] Timeout in seconds.
  --type=<value>     Type

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  List HALO credentials.
```

## `dx halo join`

Join HALO (device) invitation.

```
USAGE
  $ dx halo join [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent] [--timeout
    <value>] [--invitation <value>]

FLAGS
  -v, --verbose         Verbose output
  --config=<value>      [default: /Users/dmaretskyi/.config/dx/profile/default.yml] Config file.
  --dry-run             Dry run.
  --invitation=<value>  Invitation code
  --no-agent            Auto-start agent.
  --profile=<value>     [default: default] User profile.
  --timeout=<value>     [default: 30] Timeout in seconds.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Join HALO (device) invitation.
```

## `dx halo share`

Create HALO (device) invitation.

```
USAGE
  $ dx halo share [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent] [--timeout
    <value>] [--noCode]

FLAGS
  -v, --verbose      Verbose output
  --config=<value>   [default: /Users/dmaretskyi/.config/dx/profile/default.yml] Config file.
  --dry-run          Dry run.
  --no-agent         Auto-start agent.
  --noCode           Flag that specifies if secret auth code is not required
  --profile=<value>  [default: default] User profile.
  --timeout=<value>  [default: 30] Timeout in seconds.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Create HALO (device) invitation.
```

## `dx help [COMMANDS]`
## `dx halo credential list`

List HALO credentials.

```
USAGE
  $ dx halo credential list [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent] [--timeout
    <value>] [--type <value>]

FLAGS
  -v, --verbose      Verbose output
  --config=<value>   [default: /Users/burdon/.config/dx/profile/default.yml] Config file.
  --dry-run          Dry run.
  --no-agent         Auto-start agent.
  --profile=<value>  [default: default] User profile.
  --timeout=<value>  [default: 30] Timeout in seconds.
  --type=<value>     Type

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  List HALO credentials.
```

## `dx halo join`

Join HALO (device) invitation.

```
USAGE
  $ dx halo join [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent] [--timeout
    <value>] [--invitation <value>]

FLAGS
  -v, --verbose         Verbose output
  --config=<value>      [default: /Users/burdon/.config/dx/profile/default.yml] Config file.
  --dry-run             Dry run.
  --invitation=<value>  Invitation code
  --no-agent            Auto-start agent.
  --profile=<value>     [default: default] User profile.
  --timeout=<value>     [default: 30] Timeout in seconds.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Join HALO (device) invitation.
```

## `dx halo share`

Create HALO (device) invitation.

```
USAGE
  $ dx halo share [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent] [--timeout
    <value>] [--noCode]

FLAGS
  -v, --verbose      Verbose output
  --config=<value>   [default: /Users/burdon/.config/dx/profile/default.yml] Config file.
  --dry-run          Dry run.
  --no-agent         Auto-start agent.
  --noCode           Flag that specifies if secret auth code is not required
  --profile=<value>  [default: default] User profile.
  --timeout=<value>  [default: 30] Timeout in seconds.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Create HALO (device) invitation.
```

## `dx help [COMMANDS]`

Display help for dx.

```
USAGE
  $ dx help [COMMANDS] [-n]
  $ dx help [COMMANDS] [-n]

ARGUMENTS
  COMMANDS  Command to show help for.
  COMMANDS  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for dx.
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v5.2.8/src/commands/help.ts)_

## `dx kube auth`

Authenticate with KUBE.

```
USAGE
  $ dx kube auth [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent] [--timeout <value>]

FLAGS
  -v, --verbose      Verbose output
  --config=<value>   [default: /Users/dmaretskyi/.config/dx/profile/default.yml] Config file.
  --dry-run          Dry run.
  --no-agent         Auto-start agent.
  --profile=<value>  [default: default] User profile.
  --timeout=<value>  [default: 30] Timeout in seconds.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Authenticate with KUBE.
```
_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v5.2.8/src/commands/help.ts)_

## `dx kube auth`

Authenticate with KUBE.

```
USAGE
  $ dx kube auth [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent] [--timeout <value>]

FLAGS
  -v, --verbose      Verbose output
  --config=<value>   [default: /Users/burdon/.config/dx/profile/default.yml] Config file.
  --dry-run          Dry run.
  --no-agent         Auto-start agent.
  --profile=<value>  [default: default] User profile.
  --timeout=<value>  [default: 30] Timeout in seconds.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Authenticate with KUBE.
```

## `dx kube deploy`

Deploy KUBE.

```
USAGE
  $ dx kube deploy --hostname <value> [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent]
    [--timeout <value>] [--provider <value>] [--accessToken <value>] [--dev]
  $ dx kube deploy --hostname <value> [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent]
    [--timeout <value>] [--provider <value>] [--accessToken <value>] [--dev]

FLAGS
  -v, --verbose          Verbose output
  -v, --verbose          Verbose output
  --accessToken=<value>  Access token for seeding admin identity
  --config=<value>       [default: /Users/dmaretskyi/.config/dx/profile/default.yml] Config file.
  --config=<value>       [default: /Users/burdon/.config/dx/profile/default.yml] Config file.
  --dev                  Deploy latest version from dev channel
  --dry-run              Dry run.
  --dry-run              Dry run.
  --hostname=<value>     (required) Hostname
  --no-agent             Auto-start agent.
  --profile=<value>      [default: default] User profile.
  --no-agent             Auto-start agent.
  --profile=<value>      [default: default] User profile.
  --provider=<value>     [default: digitalocean] Cloud Provider
  --timeout=<value>      [default: 30] Timeout in seconds.

GLOBAL FLAGS
  --json  Format output as json.
  --timeout=<value>      [default: 30] Timeout in seconds.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Deploy KUBE.
```

## `dx plugins`

List installed plugins.

```
USAGE
  $ dx plugins [--core]

FLAGS
  --core  Show core plugins.

DESCRIPTION
  List installed plugins.

EXAMPLES
  $ dx plugins
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v2.4.3/src/commands/plugins/index.ts)_
_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v2.4.3/src/commands/plugins/index.ts)_

## `dx plugins:install PLUGIN...`

Installs a plugin into the CLI.

```
USAGE
  $ dx plugins:install PLUGIN...

ARGUMENTS
  PLUGIN  Plugin to install.

FLAGS
  -f, --force    Run yarn install with force flag.
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Installs a plugin into the CLI.
  Can be installed from npm or a git url.

  Installation of a user-installed plugin will override a core plugin.

  e.g. If you have a core plugin that has a 'hello' command, installing a user-installed plugin with a 'hello' command
  will override the core plugin implementation. This is useful if a user needs to update core plugin functionality in
  the CLI without the need to patch and update the whole CLI.


ALIASES
  $ dx plugins add

EXAMPLES
  $ dx plugins:install myplugin 

  $ dx plugins:install https://github.com/someuser/someplugin

  $ dx plugins:install someuser/someplugin
```

## `dx plugins:inspect PLUGIN...`

Displays installation properties of a plugin.

```
USAGE
  $ dx plugins:inspect PLUGIN...

ARGUMENTS
  PLUGIN  [default: .] Plugin to inspect.

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

GLOBAL FLAGS
  --json  Format output as json.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Displays installation properties of a plugin.

EXAMPLES
  $ dx plugins:inspect myplugin
```

## `dx plugins:install PLUGIN...`

Installs a plugin into the CLI.

```
USAGE
  $ dx plugins:install PLUGIN...

ARGUMENTS
  PLUGIN  Plugin to install.

FLAGS
  -f, --force    Run yarn install with force flag.
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Installs a plugin into the CLI.
  Can be installed from npm or a git url.

  Installation of a user-installed plugin will override a core plugin.

  e.g. If you have a core plugin that has a 'hello' command, installing a user-installed plugin with a 'hello' command
  will override the core plugin implementation. This is useful if a user needs to update core plugin functionality in
  the CLI without the need to patch and update the whole CLI.


ALIASES
  $ dx plugins add

EXAMPLES
  $ dx plugins:install myplugin 

  $ dx plugins:install https://github.com/someuser/someplugin

  $ dx plugins:install someuser/someplugin
```

## `dx plugins:link PLUGIN`

Links a plugin into the CLI for development.

```
USAGE
  $ dx plugins:link PLUGIN

ARGUMENTS
  PATH  [default: .] path to plugin

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Links a plugin into the CLI for development.
  Installation of a linked plugin will override a user-installed or core plugin.

  e.g. If you have a user-installed or core plugin that has a 'hello' command, installing a linked plugin with a 'hello'
  command will override the user-installed or core plugin implementation. This is useful for development work.


EXAMPLES
  $ dx plugins:link myplugin
```

## `dx plugins:uninstall PLUGIN...`

Removes a plugin from the CLI.

```
USAGE
  $ dx plugins:uninstall PLUGIN...

ARGUMENTS
  PLUGIN  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ dx plugins unlink
  $ dx plugins remove
```

## `dx plugins:uninstall PLUGIN...`

Removes a plugin from the CLI.

```
USAGE
  $ dx plugins:uninstall PLUGIN...

ARGUMENTS
  PLUGIN  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ dx plugins unlink
  $ dx plugins remove
```

## `dx plugins:uninstall PLUGIN...`

Removes a plugin from the CLI.

```
USAGE
  $ dx plugins:uninstall PLUGIN...

ARGUMENTS
  PLUGIN  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ dx plugins unlink
  $ dx plugins remove
```

## `dx plugins update`

Update installed plugins.

```
USAGE
  $ dx plugins update [-h] [-v]

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Update installed plugins.
```

## `dx reset`

Reset user data.
Reset user data.

```
USAGE
  $ dx reset [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent] [--timeout
    <value>] [--force]
  $ dx reset [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent] [--timeout
    <value>] [--force]

FLAGS
  -v, --verbose      Verbose output
  --config=<value>   [default: /Users/dmaretskyi/.config/dx/profile/default.yml] Config file.
  --dry-run          Dry run.
  --force            Force delete.
  --no-agent         Auto-start agent.
  --profile=<value>  [default: default] User profile.
  --timeout=<value>  [default: 30] Timeout in seconds.

GLOBAL FLAGS
  --json  Format output as json.
  -v, --verbose      Verbose output
  --config=<value>   [default: /Users/burdon/.config/dx/profile/default.yml] Config file.
  --dry-run          Dry run.
  --force            Force delete.
  --no-agent         Auto-start agent.
  --profile=<value>  [default: default] User profile.
  --timeout=<value>  [default: 30] Timeout in seconds.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Reset user data.
  Reset user data.
```

## `dx shell`

Interactive shell.

```
USAGE
  $ dx shell [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent] [--timeout <value>]
  $ dx shell [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent] [--timeout <value>]

FLAGS
  -v, --verbose      Verbose output
  --config=<value>   [default: /Users/dmaretskyi/.config/dx/profile/default.yml] Config file.
  --dry-run          Dry run.
  --no-agent         Auto-start agent.
  --profile=<value>  [default: default] User profile.
  --timeout=<value>  [default: 30] Timeout in seconds.

GLOBAL FLAGS
  --json  Format output as json.
  -v, --verbose      Verbose output
  --config=<value>   [default: /Users/burdon/.config/dx/profile/default.yml] Config file.
  --dry-run          Dry run.
  --no-agent         Auto-start agent.
  --profile=<value>  [default: default] User profile.
  --timeout=<value>  [default: 30] Timeout in seconds.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Interactive shell.
```

## `dx space`

List spaces.

```
USAGE
  $ dx space [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent] [--timeout <value>]
  $ dx space [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent] [--timeout <value>]

FLAGS
  -v, --verbose      Verbose output
  --config=<value>   [default: /Users/dmaretskyi/.config/dx/profile/default.yml] Config file.
  --dry-run          Dry run.
  --no-agent         Auto-start agent.
  --profile=<value>  [default: default] User profile.
  --timeout=<value>  [default: 30] Timeout in seconds.

GLOBAL FLAGS
  --json  Format output as json.
  -v, --verbose      Verbose output
  --config=<value>   [default: /Users/burdon/.config/dx/profile/default.yml] Config file.
  --dry-run          Dry run.
  --no-agent         Auto-start agent.
  --profile=<value>  [default: default] User profile.
  --timeout=<value>  [default: 30] Timeout in seconds.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  List spaces.
```

## `dx space create [NAME]`

Create space.

```
USAGE
  $ dx space create [NAME] [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent] [--timeout
    <value>]
  $ dx space create [NAME] [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent] [--timeout
    <value>]

FLAGS
  -v, --verbose      Verbose output
  --config=<value>   [default: /Users/dmaretskyi/.config/dx/profile/default.yml] Config file.
  --dry-run          Dry run.
  --no-agent         Auto-start agent.
  --profile=<value>  [default: default] User profile.
  --timeout=<value>  [default: 30] Timeout in seconds.
  -v, --verbose      Verbose output
  --config=<value>   [default: /Users/burdon/.config/dx/profile/default.yml] Config file.
  --dry-run          Dry run.
  --no-agent         Auto-start agent.
  --profile=<value>  [default: default] User profile.
  --timeout=<value>  [default: 30] Timeout in seconds.

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
    <value>] [--columns <value> | -x] [--sort <value>] [--filter <value>] [--output csv|json|yaml |  | [--csv |
    --no-truncate]] [--no-header | ]

ARGUMENTS
  KEY  Space key head in hex.

FLAGS
  -v, --verbose      Verbose output
  -x, --extended     show extra columns
  --columns=<value>  only show provided columns (comma-separated)
  --config=<value>   [default: /Users/dmaretskyi/.config/dx/profile/default.yml] Config file.
  --csv              output is csv format [alias: --output=csv]
  --dry-run          Dry run.
  --filter=<value>   filter property by partial string matching, ex: name=foo
  --no-agent         Auto-start agent.
  --no-header        hide table header from output
  --no-truncate      do not truncate output to fit screen
  --output=<option>  output in a more machine friendly format
                     <options: csv|json|yaml>
  --profile=<value>  [default: default] User profile.
  --sort=<value>     property to sort by (prepend '-' for descending)
  --timeout=<value>  [default: 30] Timeout in seconds.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Create new epoch.
```

## `dx space invite KEY`
## `dx space epoch [KEY]`

Create new epoch.

```
USAGE
  $ dx space epoch [KEY] [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent] [--timeout
    <value>] [--columns <value> | -x] [--sort <value>] [--filter <value>] [--output csv|json|yaml |  | [--csv |
    --no-truncate]] [--no-header | ]

ARGUMENTS
  KEY  Space key head in hex.

FLAGS
  -v, --verbose      Verbose output
  -x, --extended     show extra columns
  --columns=<value>  only show provided columns (comma-separated)
  --config=<value>   [default: /Users/burdon/.config/dx/profile/default.yml] Config file.
  --csv              output is csv format [alias: --output=csv]
  --dry-run          Dry run.
  --filter=<value>   filter property by partial string matching, ex: name=foo
  --no-agent         Auto-start agent.
  --no-header        hide table header from output
  --no-truncate      do not truncate output to fit screen
  --output=<option>  output in a more machine friendly format
                     <options: csv|json|yaml>
  --profile=<value>  [default: default] User profile.
  --sort=<value>     property to sort by (prepend '-' for descending)
  --timeout=<value>  [default: 30] Timeout in seconds.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Create new epoch.
```

## `dx space invite KEY`

Create space invitation.

```
USAGE
  $ dx space invite KEY [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent] [--timeout
    <value>]
  $ dx space invite KEY [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent] [--timeout
    <value>]

FLAGS
  -v, --verbose      Verbose output
  --config=<value>   [default: /Users/dmaretskyi/.config/dx/profile/default.yml] Config file.
  --dry-run          Dry run.
  --no-agent         Auto-start agent.
  --profile=<value>  [default: default] User profile.
  --timeout=<value>  [default: 30] Timeout in seconds.

GLOBAL FLAGS
  --json  Format output as json.
  -v, --verbose      Verbose output
  --config=<value>   [default: /Users/burdon/.config/dx/profile/default.yml] Config file.
  --dry-run          Dry run.
  --no-agent         Auto-start agent.
  --profile=<value>  [default: default] User profile.
  --timeout=<value>  [default: 30] Timeout in seconds.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Create space invitation.
```

## `dx space join`

Join space invitation

```
USAGE
  $ dx space join [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent] [--timeout
    <value>] [--invitation <value>] [--secret <value>]
  $ dx space join [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent] [--timeout
    <value>] [--invitation <value>] [--secret <value>]

FLAGS
  -v, --verbose         Verbose output
  --config=<value>      [default: /Users/dmaretskyi/.config/dx/profile/default.yml] Config file.
  --dry-run             Dry run.
  -v, --verbose         Verbose output
  --config=<value>      [default: /Users/burdon/.config/dx/profile/default.yml] Config file.
  --dry-run             Dry run.
  --invitation=<value>  Invitation code
  --no-agent            Auto-start agent.
  --profile=<value>     [default: default] User profile.
  --no-agent            Auto-start agent.
  --profile=<value>     [default: default] User profile.
  --secret=<value>      Invitation secret
  --timeout=<value>     [default: 30] Timeout in seconds.
  --timeout=<value>     [default: 30] Timeout in seconds.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Join space invitation
```

## `dx space list`

List spaces.

```
USAGE
  $ dx space list [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent] [--timeout
    <value>] [--columns <value> | -x] [--sort <value>] [--filter <value>] [--output csv|json|yaml |  | [--csv |
    --no-truncate]] [--no-header | ]
  $ dx space list [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent] [--timeout
    <value>] [--columns <value> | -x] [--sort <value>] [--filter <value>] [--output csv|json|yaml |  | [--csv |
    --no-truncate]] [--no-header | ]

FLAGS
  -v, --verbose      Verbose output
  -v, --verbose      Verbose output
  -x, --extended     show extra columns
  --columns=<value>  only show provided columns (comma-separated)
  --config=<value>   [default: /Users/dmaretskyi/.config/dx/profile/default.yml] Config file.
  --config=<value>   [default: /Users/burdon/.config/dx/profile/default.yml] Config file.
  --csv              output is csv format [alias: --output=csv]
  --dry-run          Dry run.
  --dry-run          Dry run.
  --filter=<value>   filter property by partial string matching, ex: name=foo
  --no-agent         Auto-start agent.
  --no-agent         Auto-start agent.
  --no-header        hide table header from output
  --no-truncate      do not truncate output to fit screen
  --output=<option>  output in a more machine friendly format
                     <options: csv|json|yaml>
  --profile=<value>  [default: default] User profile.
  --profile=<value>  [default: default] User profile.
  --sort=<value>     property to sort by (prepend '-' for descending)
  --timeout=<value>  [default: 30] Timeout in seconds.
  --timeout=<value>  [default: 30] Timeout in seconds.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  List spaces.
```

## `dx space members [KEY]`

List space members.

```
USAGE
  $ dx space members [KEY] [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent] [--timeout
    <value>] [--columns <value> | -x] [--sort <value>] [--filter <value>] [--output csv|json|yaml |  | [--csv |
    --no-truncate]] [--no-header | ]

ARGUMENTS
  KEY  Space key head in hex.
  $ dx space members [KEY] [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent] [--timeout
    <value>] [--columns <value> | -x] [--sort <value>] [--filter <value>] [--output csv|json|yaml |  | [--csv |
    --no-truncate]] [--no-header | ]

ARGUMENTS
  KEY  Space key head in hex.

FLAGS
  -v, --verbose      Verbose output
  -v, --verbose      Verbose output
  -x, --extended     show extra columns
  --columns=<value>  only show provided columns (comma-separated)
  --config=<value>   [default: /Users/dmaretskyi/.config/dx/profile/default.yml] Config file.
  --config=<value>   [default: /Users/burdon/.config/dx/profile/default.yml] Config file.
  --csv              output is csv format [alias: --output=csv]
  --dry-run          Dry run.
  --dry-run          Dry run.
  --filter=<value>   filter property by partial string matching, ex: name=foo
  --no-agent         Auto-start agent.
  --no-agent         Auto-start agent.
  --no-header        hide table header from output
  --no-truncate      do not truncate output to fit screen
  --output=<option>  output in a more machine friendly format
                     <options: csv|json|yaml>
  --profile=<value>  [default: default] User profile.
  --profile=<value>  [default: default] User profile.
  --sort=<value>     property to sort by (prepend '-' for descending)
  --timeout=<value>  [default: 30] Timeout in seconds.
  --timeout=<value>  [default: 30] Timeout in seconds.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  List space members.
```

## `dx tunnel list`

List tunnels.

```
USAGE
  $ dx tunnel list [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent] [--timeout <value>]
  $ dx tunnel list [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent] [--timeout <value>]

FLAGS
  -v, --verbose      Verbose output
  --config=<value>   [default: /Users/dmaretskyi/.config/dx/profile/default.yml] Config file.
  --dry-run          Dry run.
  --no-agent         Auto-start agent.
  --profile=<value>  [default: default] User profile.
  --timeout=<value>  [default: 30] Timeout in seconds.
  -v, --verbose      Verbose output
  --config=<value>   [default: /Users/burdon/.config/dx/profile/default.yml] Config file.
  --dry-run          Dry run.
  --no-agent         Auto-start agent.
  --profile=<value>  [default: default] User profile.
  --timeout=<value>  [default: 30] Timeout in seconds.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  List tunnels.
```

## `dx tunnel set`

Enable or disable tunnel.

```
USAGE
  $ dx tunnel set --app <value> [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent]
    [--timeout <value>] [--enabled] [--disabled]
  $ dx tunnel set --app <value> [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent]
    [--timeout <value>] [--enabled] [--disabled]

FLAGS
  -v, --verbose      Verbose output
  -v, --verbose      Verbose output
  --app=<value>      (required) Application name
  --config=<value>   [default: /Users/dmaretskyi/.config/dx/profile/default.yml] Config file.
  --config=<value>   [default: /Users/burdon/.config/dx/profile/default.yml] Config file.
  --disabled         Disable tunnel.
  --dry-run          Dry run.
  --dry-run          Dry run.
  --enabled          Enable tunnel.
  --no-agent         Auto-start agent.
  --profile=<value>  [default: default] User profile.
  --timeout=<value>  [default: 30] Timeout in seconds.
  --no-agent         Auto-start agent.
  --profile=<value>  [default: default] User profile.
  --timeout=<value>  [default: 30] Timeout in seconds.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Enable or disable tunnel.
```
<!-- commandsstop -->
