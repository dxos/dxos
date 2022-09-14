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
$ npm install -g @dxos/dx-cli
$ dx COMMAND
running command...
$ dx (--version)
@dxos/dx-cli/2.33.8 darwin-arm64 node-v16.14.0
$ dx --help [COMMAND]
USAGE
  $ dx COMMAND
...
```
<!-- usagestop -->

# Commands

<!-- commands -->
* [`dx config`](#dx-config)
* [`dx halo`](#dx-halo)
* [`dx halo create [USERNAME]`](#dx-halo-create-username)
* [`dx halo recover [SEEDPHRASE]`](#dx-halo-recover-seedphrase)
* [`dx help [COMMAND]`](#dx-help-command)
* [`dx plugins`](#dx-plugins)
* [`dx plugins:install PLUGIN...`](#dx-pluginsinstall-plugin)
* [`dx plugins:inspect PLUGIN...`](#dx-pluginsinspect-plugin)
* [`dx plugins:install PLUGIN...`](#dx-pluginsinstall-plugin-1)
* [`dx plugins:link PLUGIN`](#dx-pluginslink-plugin)
* [`dx plugins:uninstall PLUGIN...`](#dx-pluginsuninstall-plugin)
* [`dx plugins:uninstall PLUGIN...`](#dx-pluginsuninstall-plugin-1)
* [`dx plugins:uninstall PLUGIN...`](#dx-pluginsuninstall-plugin-2)
* [`dx plugins update`](#dx-plugins-update)
* [`dx shell`](#dx-shell)
* [`dx space`](#dx-space)
* [`dx space create`](#dx-space-create)

## `dx config`

Show config file.

```
USAGE
  $ dx config [--config <value>] [--json]

GLOBAL FLAGS
  --config=<value>  Specify config file
  --json            Format output as json.

DESCRIPTION
  Show config file.
```

## `dx halo`

Show HALO profile.

```
USAGE
  $ dx halo [--config <value>] [--json]

GLOBAL FLAGS
  --config=<value>  Specify config file
  --json            Format output as json.

DESCRIPTION
  Show HALO profile.
```

## `dx halo create [USERNAME]`

Create HALO.

```
USAGE
  $ dx halo create [USERNAME] [--config <value>] [--json]

GLOBAL FLAGS
  --config=<value>  Specify config file
  --json            Format output as json.

DESCRIPTION
  Create HALO.
```

## `dx halo recover [SEEDPHRASE]`

Recover HALO.

```
USAGE
  $ dx halo recover [SEEDPHRASE] [--config <value>] [--json]

GLOBAL FLAGS
  --config=<value>  Specify config file
  --json            Format output as json.

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

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v5.1.12/src/commands/help.ts)_

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

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v2.1.0/src/commands/plugins/index.ts)_

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

## `dx shell`

Interactive shell.

```
USAGE
  $ dx shell [--config <value>]

GLOBAL FLAGS
  --config=<value>  Specify config file

DESCRIPTION
  Interactive shell.
```

## `dx space`

Show Spaces.

```
USAGE
  $ dx space [--config <value>]

GLOBAL FLAGS
  --config=<value>  Specify config file

DESCRIPTION
  Show Spaces.
```

## `dx space create`

Create spaces.

```
USAGE
  $ dx space create [--config <value>]

GLOBAL FLAGS
  --config=<value>  Specify config file

DESCRIPTION
  Create spaces.
```

## `dx app list`

List apps.

USAGE
  $ dx app list [--config <value>]

FLAGS
  --config=<value>   Specify config file

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  List apps.

## `dx app list`

Publish apps.

USAGE
  $ dx app publish [--config <value>] [--configPath <value>] [--verbose]

FLAGS
  --config=<value>      Specify config file
  --configPath=<value>  Path to dx.yml
  --verbose             Verbose output

DESCRIPTION
  Publish apps.
<!-- commandsstop -->
