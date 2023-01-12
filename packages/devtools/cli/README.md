# DX CLI

DXOS command line interface.

TODO(wittjosiah): Add oclif-specific linting rules.

# Development

Run the build script from the root directory.

```bash
$ nx run kodama:build --watch=true
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
@dxos/cli/0.1.22 darwin-arm64 node-v16.15.1
$ dx --help [COMMAND]
USAGE
  $ dx COMMAND
...
```
<!-- usagestop -->

# Commands

<!-- commands -->
* [`dx app create NAME`](#dx-app-create-name)
* [`dx app list`](#dx-app-list)
* [`dx app publish`](#dx-app-publish)
* [`dx config`](#dx-config)
* [`dx halo`](#dx-halo)
* [`dx halo create [DISPLAYNAME]`](#dx-halo-create-displayname)
* [`dx halo recover [SEEDPHRASE]`](#dx-halo-recover-seedphrase)
* [`dx help [COMMAND]`](#dx-help-command)
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
* [`dx space`](#dx-space)
* [`dx space create [NAME]`](#dx-space-create-name)
* [`dx space invite [KEY]`](#dx-space-invite-key)
* [`dx space join`](#dx-space-join)
* [`dx space list`](#dx-space-list)
* [`dx space members [KEY]`](#dx-space-members-key)

## `dx app create NAME`

Create a DXOS project.

```
USAGE
  $ dx app create [NAME] [--config <value>] [--timeout <value>] [--tag <value>] [-t hello|bare|tasks] [-i]

ARGUMENTS
  NAME  Name of the project

FLAGS
  -i, --interactive        Customize app template options via interactive prompt
  -t, --template=<option>  [default: hello] Template to use when creating the project.
                           <options: hello|bare|tasks>
  --config=<value>         Specify config file
  --tag=<value>            Git tag or branch of the DXOS repo to checkout.
  --timeout=<value>        [default: 30] Timeout in seconds

DESCRIPTION
  Create a DXOS project.
```

## `dx app list`

List apps.

```
USAGE
  $ dx app list [--config <value>] [--timeout <value>] [--json]

FLAGS
  --config=<value>   Specify config file
  --timeout=<value>  [default: 30] Timeout in seconds

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  List apps.
```

## `dx app publish`

Publish apps.

```
USAGE
  $ dx app publish [--config <value>] [--timeout <value>] [--configPath <value>] [--accessToken <value>]
    [--skipExisting] [--verbose] [--version <value>]

FLAGS
  --accessToken=<value>  Access token for publishing
  --config=<value>       Specify config file
  --configPath=<value>   Path to dx.yml
  --skipExisting         Do not update content on KUBE if version already exists
  --timeout=<value>      [default: 30] Timeout in seconds
  --verbose              Verbose output
  --version=<value>      Version of modules to publish

DESCRIPTION
  Publish apps.
```

## `dx config`

Show config file.

```
USAGE
  $ dx config [--config <value>] [--timeout <value>] [--json]

FLAGS
  --config=<value>   Specify config file
  --timeout=<value>  [default: 30] Timeout in seconds

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Show config file.
```

## `dx halo`

Show HALO profile.

```
USAGE
  $ dx halo [--config <value>] [--timeout <value>] [--json]

FLAGS
  --config=<value>   Specify config file
  --timeout=<value>  [default: 30] Timeout in seconds

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Show HALO profile.
```

## `dx halo create [DISPLAYNAME]`

Create HALO.

```
USAGE
  $ dx halo create [DISPLAYNAME] [--config <value>] [--timeout <value>] [--json]

FLAGS
  --config=<value>   Specify config file
  --timeout=<value>  [default: 30] Timeout in seconds

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Create HALO.
```

## `dx halo recover [SEEDPHRASE]`

Recover HALO.

```
USAGE
  $ dx halo recover [SEEDPHRASE] [--config <value>] [--timeout <value>] [--json]

FLAGS
  --config=<value>   Specify config file
  --timeout=<value>  [default: 30] Timeout in seconds

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Recover HALO.
```

## `dx help [COMMAND]`

Display help for dx.

```
USAGE
  $ dx help [COMMAND] [-n]

ARGUMENTS
  COMMAND  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for dx.
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v5.1.15/src/commands/help.ts)_

## `dx kube deploy`

Deploy KUBE.

```
USAGE
  $ dx kube deploy --hostname <value> [--config <value>] [--timeout <value>] [--provider <value>] [--accessToken
    <value>] [--dev]

FLAGS
  --accessToken=<value>  Access token for seeding admin identity
  --config=<value>       Specify config file
  --dev                  Deploy latest version from dev channel
  --hostname=<value>     (required) Hostname
  --provider=<value>     [default: digitalocean] Cloud Provider
  --timeout=<value>      [default: 30] Timeout in seconds

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

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v2.1.4/src/commands/plugins/index.ts)_

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

Reset all data.

```
USAGE
  $ dx reset [--config <value>] [--timeout <value>]

FLAGS
  --config=<value>   Specify config file
  --timeout=<value>  [default: 30] Timeout in seconds

DESCRIPTION
  Reset all data.
```

## `dx shell`

Interactive shell.

```
USAGE
  $ dx shell [--config <value>] [--timeout <value>]

FLAGS
  --config=<value>   Specify config file
  --timeout=<value>  [default: 30] Timeout in seconds

DESCRIPTION
  Interactive shell.
```

## `dx space`

List spaces.

```
USAGE
  $ dx space [--config <value>] [--timeout <value>]

FLAGS
  --config=<value>   Specify config file
  --timeout=<value>  [default: 30] Timeout in seconds

DESCRIPTION
  List spaces.
```

## `dx space create [NAME]`

Create space.

```
USAGE
  $ dx space create [NAME] [--config <value>] [--timeout <value>] [--json]

FLAGS
  --config=<value>   Specify config file
  --timeout=<value>  [default: 30] Timeout in seconds

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Create space.
```

## `dx space invite [KEY]`

Create space invitation.

```
USAGE
  $ dx space invite [KEY] [--config <value>] [--timeout <value>]

FLAGS
  --config=<value>   Specify config file
  --timeout=<value>  [default: 30] Timeout in seconds

DESCRIPTION
  Create space invitation.
```

## `dx space join`

Join space invitation

```
USAGE
  $ dx space join [--config <value>] [--timeout <value>] [--json] [--invitation <value>] [--secret <value>]

FLAGS
  --config=<value>      Specify config file
  --invitation=<value>  Invitation code
  --secret=<value>      Invitation secret
  --timeout=<value>     [default: 30] Timeout in seconds

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Join space invitation
```

## `dx space list`

List spaces.

```
USAGE
  $ dx space list [--config <value>] [--timeout <value>] [--json] [--columns <value> | -x] [--sort <value>]
    [--filter <value>] [--output csv|json|yaml |  | [--csv | --no-truncate]] [--no-header | ]

FLAGS
  -x, --extended     show extra columns
  --columns=<value>  only show provided columns (comma-separated)
  --config=<value>   Specify config file
  --csv              output is csv format [alias: --output=csv]
  --filter=<value>   filter property by partial string matching, ex: name=foo
  --no-header        hide table header from output
  --no-truncate      do not truncate output to fit screen
  --output=<option>  output in a more machine friendly format
                     <options: csv|json|yaml>
  --sort=<value>     property to sort by (prepend '-' for descending)
  --timeout=<value>  [default: 30] Timeout in seconds

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  List spaces.
```

## `dx space members [KEY]`

List space members.

```
USAGE
  $ dx space members [KEY] [--config <value>] [--timeout <value>] [--json] [--columns <value> | -x] [--sort
    <value>] [--filter <value>] [--output csv|json|yaml |  | [--csv | --no-truncate]] [--no-header | ]

FLAGS
  -x, --extended     show extra columns
  --columns=<value>  only show provided columns (comma-separated)
  --config=<value>   Specify config file
  --csv              output is csv format [alias: --output=csv]
  --filter=<value>   filter property by partial string matching, ex: name=foo
  --no-header        hide table header from output
  --no-truncate      do not truncate output to fit screen
  --output=<option>  output in a more machine friendly format
                     <options: csv|json|yaml>
  --sort=<value>     property to sort by (prepend '-' for descending)
  --timeout=<value>  [default: 30] Timeout in seconds

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  List space members.
```
<!-- commandsstop -->
