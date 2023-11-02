# DX CLI

DXOS command line interface.

<!-- toc -->
* [DX CLI](#dx-cli)
* [Instalation](#instalation)
* [Running an Agent](#running-an-agent)
* [Development](#development)
* [Usage](#usage)
<!-- tocstop -->

# Installation
```terminal
npm install -g @dxos/cli@main
```
---
# Running an Agent
Agent is a name for DXOS Client which is run by CLI in the background in the daemonized process. 

## Start an agent as a system daemon via CLI command

Agent could be started as a system daemon via cli command:

```terminal
dx agent start --system
```

This command will run an agent as `launchd` service (macOS users) or as a `systemd` service (Linux users).

Other useful commands:

```terminal
dx agent list --system
dx agent restart --system
dx agent stop --system
```

Alternatively, manual setup could be used (see below).

## Install agent as a `launchd` service (macOS users) - manual setup
1. Install DXOS CLI with steps in [Installation](#Instalation) section.
2. Replace `??NODE_PATH??` in "./init-templates/org.dxos.agent.plist" with output of command `dirname $(which node)`
3. Replace `??DX_PATH??` in "./init-templates/org.dxos.agent.plist" with output of command `which dx`
4. Copy `./init-templates/org.dxos.agent.plist` -> `~/Library/LaunchAgents/org.dxos.agent.plist`
5. Run `launchctl load -w ~/Library/LaunchAgents/org.dxos.agent.plist`

### Stop agent started by LaunchD
1. Run `launchctl unload -w ~/Library/LaunchAgents/org.dxos.agent.plist`
2. Remove `~/Library/LaunchAgents/org.dxos.agent.plist`

## Install agent as a `systemd` service (Linux users) - manual setup
1. Install DXOS CLI with steps in [Installation](#Instalation) section.
1. Copy `./init-templates/dxos-agent.service` and `./init-templates/pre-dxos-agent.service` -> `~/.config/systemd/user/`
1. Run `systemctl --user daemon-reload` to make the systemd daemon aware of the service
1. Run `systemctl --user enable dxos-agent` to enable the service to start automatically
1. Optionally, run `sudo loginctl enable-linger {USERNAME}` to enable the service to start without user login (replace `{USERNAME}` with the name of the user that will run the service)
1. Run `systemctl --user start dxos-agent` to start the service

## Start agent with CLI (not very reliable)
Agent is automatically started by each command that requires Client (to avoid this behavior use `--no-agent` flag). You can use `--profile` flag (default value is `default`) to run agent in an isolated profile, and `--foreground` to run agent in attached process.
```terminal
dx agent start
```
see: [dx agent start](#dx-agent-start)

## Adding Agent to your Composer Identity 
1. Go to [Composer](https://composer.dev.dxos.org). And create a device invitation.
![Composer add device](./public/composer-sidebar.png)
![Composer invitation](./public/composer-add-device.png)

2. Run halo join command in your terminal.
![CLI halo join flow](./public/cli-halo-join.png)

3. Proceed with invitation

## Troubleshooting
1. Make sure you are running the latest version of the shared worker in the browser. Go to the shared workers tab chrome://inspect/#workers, kill `dxos-vault` worker, then reload the Composer tab.
2. Restart your agent with [```dx agent restart```](#dx-agent-restart). Also useful command[ ```dx agent stop --all```](#dx-agent-stop)
#### Danger Zone
3. Reset Storage. Warning: Agent will lose its storage, and config file will be deleted [```dx reset --force```](#dx-reset)
---


# Development

To build the CLI:

```bash
nx run cli:build --watch=true
```

Run the CLI from the local directory:

```bash
./bin/run config --json
```

Or source the following script to set the `dx` alias from any directory in the repo.

```bash
. $(git rev-parse --show-toplevel)/packages/devtools/cli/scripts/dev.sh

dx config --json
```

## Reporting errors

Run the following command to create a gist of the debug stats.

```bash
dx debug stats --json --no-agent | gh gist create
```

# Usage

<!-- usage -->
```sh-session
$ npm install -g @dxos/cli
$ dx COMMAND
running command...
$ dx (--version)
@dxos/cli/0.1.57 darwin-arm64 node-v18.12.1
$ dx --help [COMMAND]
USAGE
  $ dx COMMAND
...
```
<!-- usagestop -->

## Commands

<!-- commands -->
* [`dx agent list`](#dx-agent-list)
* [`dx agent restart`](#dx-agent-restart)
* [`dx agent start`](#dx-agent-start)
* [`dx agent stop`](#dx-agent-stop)
* [`dx app create NAME`](#dx-app-create-name)
* [`dx app list`](#dx-app-list)
* [`dx app open URL`](#dx-app-open-url)
* [`dx app publish`](#dx-app-publish)
* [`dx config`](#dx-config)
* [`dx debug diagnostics`](#dx-debug-diagnostics)
* [`dx debug generate [KEY]`](#dx-debug-generate-key)
* [`dx debug metrics [COMMAND]`](#dx-debug-metrics-command)
* [`dx debug status`](#dx-debug-status)
* [`dx device`](#dx-device)
* [`dx device list`](#dx-device-list)
* [`dx function dev`](#dx-function-dev)
* [`dx function dev-server`](#dx-function-dev-server)
* [`dx function exec NAME`](#dx-function-exec-name)
* [`dx function list`](#dx-function-list)
* [`dx function logs NAME`](#dx-function-logs-name)
* [`dx halo create DISPLAYNAME`](#dx-halo-create-displayname)
* [`dx halo credential add [CREDENTIAL]`](#dx-halo-credential-add-credential)
* [`dx halo credential list`](#dx-halo-credential-list)
* [`dx halo identity`](#dx-halo-identity)
* [`dx halo join`](#dx-halo-join)
* [`dx halo share`](#dx-halo-share)
* [`dx help [COMMANDS]`](#dx-help-commands)
* [`dx kube auth`](#dx-kube-auth)
* [`dx kube deploy`](#dx-kube-deploy)
* [`dx plugins`](#dx-plugins)
* [`dx plugins:install PLUGIN...`](#dx-pluginsinstall-plugin)
* [`dx plugins:inspect PLUGIN...`](#dx-pluginsinspect-plugin)
* [`dx plugins:install PLUGIN...`](#dx-pluginsinstall-plugin-1)
* [`dx plugins:link PLUGIN`](#dx-pluginslink-plugin)
* [`dx plugins:uninstall PLUGIN...`](#dx-pluginsuninstall-plugin)
* [`dx plugins:uninstall PLUGIN...`](#dx-pluginsuninstall-plugin-1)
* [`dx plugins:uninstall PLUGIN...`](#dx-pluginsuninstall-plugin-2)
* [`dx plugins update`](#dx-plugins-update)
* [`dx reset`](#dx-reset)
* [`dx shell`](#dx-shell)
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
* [`dx tunnel COMMAND`](#dx-tunnel-command)
* [`dx tunnel list`](#dx-tunnel-list)

## `dx agent list`

List agents.

```
USAGE
  $ dx agent list [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent] [--timeout
    <value>] [--no-wait] [--columns <value> | -x] [--sort <value>] [--filter <value>] [--output csv|json|yaml |  |
    [--csv | --no-truncate]] [--no-header | ] [--live]

FLAGS
  -v, --verbose      Verbose output
  -x, --extended     show extra columns
  --columns=<value>  only show provided columns (comma-separated)
  --config=path      [default: /Users/<username>/.config/dx/profile/default.yml] Config file.
  --csv              output is csv format [alias: --output=csv]
  --dry-run          Dry run.
  --filter=<value>   filter property by partial string matching, ex: name=foo
  --json             Output as JSON.
  --live             Live update.
  --no-agent         Run command without agent.
  --no-header        hide table header from output
  --no-truncate      do not truncate output to fit screen
  --no-wait          Do not wait for space to be ready.
  --output=<option>  output in a more machine friendly format
                     <options: csv|json|yaml>
  --profile=<value>  [default: default] User profile.
  --sort=<value>     property to sort by (prepend '-' for descending)
  --timeout=<value>  [default: 60000] Timeout (ms).

DESCRIPTION
  List agents.
```

## `dx agent restart`

Restart agent daemon.

```
USAGE
  $ dx agent restart [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent] [--timeout
    <value>] [--no-wait] [--force]

FLAGS
  -v, --verbose      Verbose output
  --config=path      [default: /Users/<username>/.config/dx/profile/default.yml] Config file.
  --dry-run          Dry run.
  --force            Force restart.
  --json             Output as JSON.
  --no-agent         Run command without agent.
  --no-wait          Do not wait for space to be ready.
  --profile=<value>  [default: default] User profile.
  --timeout=<value>  [default: 60000] Timeout (ms).

DESCRIPTION
  Restart agent daemon.
```

## `dx agent start`

Starts the agent.

```
USAGE
  $ dx agent start [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent] [--timeout
    <value>] [--no-wait] [-f] [--ws <value>] [--echo <value>] [--monitor] [--metrics]

FLAGS
  -f, --foreground   Run in foreground.
  -v, --verbose      Verbose output
  --config=path      [default: /Users/<username>/.config/dx/profile/default.yml] Config file.
  --dry-run          Dry run.
  --echo=port        Expose ECHO REST API.
  --json             Output as JSON.
  --metrics          Start metrics recording.
  --monitor          Run epoch monitoring.
  --no-agent         Run command without agent.
  --no-wait          Do not wait for space to be ready.
  --profile=<value>  [default: default] User profile.
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
    <value>] [--no-wait] [--all] [--force]

FLAGS
  -v, --verbose      Verbose output
  --all              Stop all agents.
  --config=path      [default: /Users/<username>/.config/dx/profile/default.yml] Config file.
  --dry-run          Dry run.
  --force            Force stop.
  --json             Output as JSON.
  --no-agent         Run command without agent.
  --no-wait          Do not wait for space to be ready.
  --profile=<value>  [default: default] User profile.
  --timeout=<value>  [default: 60000] Timeout (ms).

DESCRIPTION
  Stop agent daemon.
```

## `dx app create NAME`

Manage applications.

```
USAGE
  $ dx app create NAME [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent] [--timeout
    <value>] [--no-wait] [--tag <value>] [-t hello|bare] [-i]

ARGUMENTS
  NAME  App name.

FLAGS
  -i, --interactive        Customize app template options via interactive prompt.
  -t, --template=<option>  [default: hello] Template to use when creating the project.
                           <options: hello|bare>
  -v, --verbose            Verbose output
  --config=path            [default: /Users/<username>/.config/dx/profile/default.yml] Config file.
  --dry-run                Dry run.
  --json                   Output as JSON.
  --no-agent               Run command without agent.
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
  --config=path      [default: /Users/<username>/.config/dx/profile/default.yml] Config file.
  --dry-run          Dry run.
  --no-agent         Run command without agent.
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
  --config=path        [default: /Users/<username>/.config/dx/profile/default.yml] Config file.
  --dry-run            Dry run.
  --instances=<value>  [default: 1] Amount of test instances.
  --invite             If `true` proceed device invitation for all instances.
  --no-agent           Run command without agent.
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
  --config=path          [default: /Users/<username>/.config/dx/profile/default.yml] Config file.
  --configPath=<value>   Path to dx.yml
  --dry-run              Dry run.
  --json                 Output as JSON.
  --no-agent             Run command without agent.
  --no-wait              Do not wait for space to be ready.
  --profile=<value>      [default: default] User profile.
  --skipExisting         Do not update content on KUBE if version already exists.
  --timeout=<value>      [default: 60000] Timeout (ms).
  --version=<value>      Version of modules to publish.

DESCRIPTION
  Publish apps.
```

## `dx config`

Show config file.

```
USAGE
  $ dx config [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent] [--timeout
    <value>] [--no-wait]

FLAGS
  -v, --verbose      Verbose output
  --config=path      [default: /Users/<username>/.config/dx/profile/default.yml] Config file.
  --dry-run          Dry run.
  --no-agent         Run command without agent.
  --no-wait          Do not wait for space to be ready.
  --profile=<value>  [default: default] User profile.
  --timeout=<value>  [default: 60000] Timeout (ms).

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Show config file.
```

## `dx debug diagnostics`

Create diagnostics report.

```
USAGE
  $ dx debug diagnostics [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent] [--timeout
    <value>] [--no-wait] [--humanize] [--truncate]

FLAGS
  -v, --verbose      Verbose output
  --config=path      [default: /Users/<username>/.config/dx/profile/default.yml] Config file.
  --dry-run          Dry run.
  --humanize         Humanize keys.
  --json             Output as JSON.
  --no-agent         Run command without agent.
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
  --config=path        [default: /Users/<username>/.config/dx/profile/default.yml] Config file.
  --dry-run            Dry run.
  --epoch=<value>      Number of mutations per epoch.
  --interval=<value>   Interval between mutations (ms).
  --jitter=<value>     Inverval variance (ms).
  --json               Output as JSON.
  --mutations=<value>  Number of mutations.
  --no-agent           Run command without agent.
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
  --config=path      [default: /Users/<username>/.config/dx/profile/default.yml] Config file.
  --dry-run          Dry run.
  --no-agent         Run command without agent.
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
  --config=path       [default: /Users/<username>/.config/dx/profile/default.yml] Config file.
  --dry-run           Dry run.
  --interval=<value>  [default: 1000] Update interval (ms).
  --json              Output as JSON.
  --no-agent          Run command without agent.
  --no-wait           Do not wait for space to be ready.
  --profile=<value>   [default: default] User profile.
  --timeout=<value>   [default: 60000] Timeout (ms).

DESCRIPTION
  Display status.
```

## `dx device`

Show device info.

```
USAGE
  $ dx device [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent] [--timeout
    <value>] [--no-wait]

FLAGS
  -v, --verbose      Verbose output
  --config=path      [default: /Users/<username>/.config/dx/profile/default.yml] Config file.
  --dry-run          Dry run.
  --no-agent         Run command without agent.
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
  --config=path      [default: /Users/<username>/.config/dx/profile/default.yml] Config file.
  --csv              output is csv format [alias: --output=csv]
  --dry-run          Dry run.
  --filter=<value>   filter property by partial string matching, ex: name=foo
  --json             Output as JSON.
  --no-agent         Run command without agent.
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

## `dx function dev`

Development server.

```
USAGE
  $ dx function dev [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent] [--timeout
    <value>] [--no-wait] [--require <value>] [--manifest <value>]

FLAGS
  -v, --verbose         Verbose output
  --config=path         [default: /Users/<username>/.config/dx/profile/default.yml] Config file.
  --dry-run             Dry run.
  --json                Output as JSON.
  --manifest=<value>    [default: functions.yml]
  --no-agent            Run command without agent.
  --no-wait             Do not wait for space to be ready.
  --profile=<value>     [default: default] User profile.
  --require=<value>...  [default: ts-node/register]
  --timeout=<value>     [default: 60000] Timeout (ms).

DESCRIPTION
  Development server.

ALIASES
  $ dx function dev

EXAMPLES
  Run with TypeScript support.

    $ dx function dev-server -r ts-node/register --verbose
```

## `dx function dev-server`

Development server.

```
USAGE
  $ dx function dev-server [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent] [--timeout
    <value>] [--no-wait] [--require <value>] [--manifest <value>]

FLAGS
  -v, --verbose         Verbose output
  --config=path         [default: /Users/<username>/.config/dx/profile/default.yml] Config file.
  --dry-run             Dry run.
  --json                Output as JSON.
  --manifest=<value>    [default: functions.yml]
  --no-agent            Run command without agent.
  --no-wait             Do not wait for space to be ready.
  --profile=<value>     [default: default] User profile.
  --require=<value>...  [default: ts-node/register]
  --timeout=<value>     [default: 60000] Timeout (ms).

DESCRIPTION
  Development server.

ALIASES
  $ dx function dev

EXAMPLES
  Run with TypeScript support.

    $ dx function dev-server -r ts-node/register --verbose
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
  --config=path      [default: /Users/<username>/.config/dx/profile/default.yml] Config file.
  --dry-run          Dry run.
  --no-agent         Run command without agent.
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
  --config=path      [default: /Users/<username>/.config/dx/profile/default.yml] Config file.
  --dry-run          Dry run.
  --no-agent         Run command without agent.
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
  --config=path      [default: /Users/<username>/.config/dx/profile/default.yml] Config file.
  --dry-run          Dry run.
  --no-agent         Run command without agent.
  --no-wait          Do not wait for space to be ready.
  --profile=<value>  [default: default] User profile.
  --timeout=<value>  [default: 60000] Timeout (ms).

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Get function logs.
```

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
  --config=path      [default: /Users/<username>/.config/dx/profile/default.yml] Config file.
  --dry-run          Dry run.
  --no-agent         Run command without agent.
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
  --config=path      [default: /Users/<username>/.config/dx/profile/default.yml] Config file.
  --dry-run          Dry run.
  --json             Output as JSON.
  --no-agent         Run command without agent.
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
  --config=path      [default: /Users/<username>/.config/dx/profile/default.yml] Config file.
  --csv              output is csv format [alias: --output=csv]
  --dry-run          Dry run.
  --filter=<value>   filter property by partial string matching, ex: name=foo
  --json             Output as JSON.
  --no-agent         Run command without agent.
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
  --config=path      [default: /Users/<username>/.config/dx/profile/default.yml] Config file.
  --dry-run          Dry run.
  --no-agent         Run command without agent.
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
  --config=path         [default: /Users/<username>/.config/dx/profile/default.yml] Config file.
  --dry-run             Dry run.
  --invitation=<value>  Invitation code
  --json                Output as JSON.
  --no-agent            Run command without agent.
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
  --config=path      [default: /Users/<username>/.config/dx/profile/default.yml] Config file.
  --dry-run          Dry run.
  --no-agent         Run command without agent.
  --no-wait          Do not wait for space to be ready.
  --noCode           Flag that specifies if secret auth code is not required
  --profile=<value>  [default: default] User profile.
  --timeout=<value>  [default: 60000] Timeout (ms).

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

ARGUMENTS
  COMMANDS  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for dx.
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v5.2.14/src/commands/help.ts)_

## `dx kube auth`

Authenticate with KUBE.

```
USAGE
  $ dx kube auth [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent] [--timeout
    <value>] [--no-wait]

FLAGS
  -v, --verbose      Verbose output
  --config=path      [default: /Users/<username>/.config/dx/profile/default.yml] Config file.
  --dry-run          Dry run.
  --no-agent         Run command without agent.
  --no-wait          Do not wait for space to be ready.
  --profile=<value>  [default: default] User profile.
  --timeout=<value>  [default: 60000] Timeout (ms).

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
    [--timeout <value>] [--no-wait] [--provider <value>] [--accessToken <value>] [--dev]

FLAGS
  -v, --verbose          Verbose output
  --accessToken=<value>  Access token for seeding admin identity
  --config=path          [default: /Users/<username>/.config/dx/profile/default.yml] Config file.
  --dev                  Deploy latest version from dev channel
  --dry-run              Dry run.
  --hostname=<value>     (required) Hostname
  --json                 Output as JSON.
  --no-agent             Run command without agent.
  --no-wait              Do not wait for space to be ready.
  --profile=<value>      [default: default] User profile.
  --provider=<value>     [default: digitalocean] Cloud Provider
  --timeout=<value>      [default: 60000] Timeout (ms).

DESCRIPTION
  Deploy KUBE.
```

## `dx plugins`

List installed plugins.

```
USAGE
  $ dx plugins [--json] [--core]

FLAGS
  --core  Show core plugins.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  List installed plugins.

EXAMPLES
  $ dx plugins
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v3.1.8/src/commands/plugins/index.ts)_

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

```
USAGE
  $ dx reset [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent] [--timeout
    <value>] [--no-wait] [--force]

FLAGS
  -v, --verbose      Verbose output
  --config=path      [default: /Users/<username>/.config/dx/profile/default.yml] Config file.
  --dry-run          Dry run.
  --force            Force delete.
  --json             Output as JSON.
  --no-agent         Run command without agent.
  --no-wait          Do not wait for space to be ready.
  --profile=<value>  [default: default] User profile.
  --timeout=<value>  [default: 60000] Timeout (ms).

DESCRIPTION
  Reset user data.
```

## `dx shell`

Interactive shell.

```
USAGE
  $ dx shell [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent] [--timeout
    <value>] [--no-wait]

FLAGS
  -v, --verbose      Verbose output
  --config=path      [default: /Users/<username>/.config/dx/profile/default.yml] Config file.
  --dry-run          Dry run.
  --json             Output as JSON.
  --no-agent         Run command without agent.
  --no-wait          Do not wait for space to be ready.
  --profile=<value>  [default: default] User profile.
  --timeout=<value>  [default: 60000] Timeout (ms).

DESCRIPTION
  Interactive shell.
```

## `dx space close [KEY]`

Close space.

```
USAGE
  $ dx space close [KEY] [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent] [--timeout
    <value>] [--no-wait]

FLAGS
  -v, --verbose      Verbose output
  --config=path      [default: /Users/<username>/.config/dx/profile/default.yml] Config file.
  --dry-run          Dry run.
  --json             Output as JSON.
  --no-agent         Run command without agent.
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
  --config=path      [default: /Users/<username>/.config/dx/profile/default.yml] Config file.
  --dry-run          Dry run.
  --no-agent         Run command without agent.
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
  --config=path      [default: /Users/<username>/.config/dx/profile/default.yml] Config file.
  --dry-run          Dry run.
  --no-agent         Run command without agent.
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
  --config=path      [default: /Users/<username>/.config/dx/profile/default.yml] Config file.
  --dry-run          Dry run.
  --no-agent         Run command without agent.
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
  --config=path         [default: /Users/<username>/.config/dx/profile/default.yml] Config file.
  --dry-run             Dry run.
  --invitation=<value>  Invitation code
  --json                Output as JSON.
  --no-agent            Run command without agent.
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
  --config=path      [default: /Users/<username>/.config/dx/profile/default.yml] Config file.
  --csv              output is csv format [alias: --output=csv]
  --dry-run          Dry run.
  --filter=<value>   filter property by partial string matching, ex: name=foo
  --json             Output as JSON.
  --live             Live update.
  --no-agent         Run command without agent.
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
  --config=path      [default: /Users/<username>/.config/dx/profile/default.yml] Config file.
  --csv              output is csv format [alias: --output=csv]
  --dry-run          Dry run.
  --filter=<value>   filter property by partial string matching, ex: name=foo
  --json             Output as JSON.
  --no-agent         Run command without agent.
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
  --config=path      [default: /Users/<username>/.config/dx/profile/default.yml] Config file.
  --dry-run          Dry run.
  --json             Output as JSON.
  --no-agent         Run command without agent.
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
  --config=path      [default: /Users/<username>/.config/dx/profile/default.yml] Config file.
  --dry-run          Dry run.
  --no-agent         Run command without agent.
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
  --config=path      [default: /Users/<username>/.config/dx/profile/default.yml] Config file.
  --dry-run          Dry run.
  --json             Output as JSON.
  --multiple         Multiple use.
  --no-agent         Run command without agent.
  --no-auth          Skip authentication challenge.
  --no-wait          Do not wait for space to be ready.
  --profile=<value>  [default: default] User profile.
  --timeout=<value>  [default: 5000] Timeout in milliseconds.

DESCRIPTION
  Create space invitation.
```

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
  --config=path      [default: /Users/<username>/.config/dx/profile/default.yml] Config file.
  --dry-run          Dry run.
  --json             Output as JSON.
  --name=<value>     [default: coffee-rugby-potato-red] Tunnel name
  --no-agent         Run command without agent.
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
  --config=path      [default: /Users/<username>/.config/dx/profile/default.yml] Config file.
  --dry-run          Dry run.
  --no-agent         Run command without agent.
  --no-wait          Do not wait for space to be ready.
  --profile=<value>  [default: default] User profile.
  --timeout=<value>  [default: 60000] Timeout (ms).

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  List tunnels.
```
<!-- commandsstop -->
