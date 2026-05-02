# Proto CLI Reference

Complete reference for all proto commands.

## Installation Commands

### proto install

Install tools from `.prototools` or specific versions.

```bash
proto install                    # Install all from .prototools
proto install node               # Install node (latest or pinned)
proto install node 20.10.0       # Install specific version
proto install node --pin         # Install and pin locally
proto install node --pin global  # Install and pin globally
proto install --config-mode all  # Include global config
```

### proto uninstall

Remove installed tool versions.

```bash
proto uninstall node 20.10.0
proto uninstall node --all       # Remove all versions
```

## Execution Commands

### proto run

Execute a tool with the detected version.

```bash
proto run node                   # Run with detected version
proto run node 18                # Run specific version
proto run node -- script.js      # Pass arguments
PROTO_NODE_VERSION=18 proto run node  # Via env var
```

### proto use

Switch to a pinned version in current shell.

```bash
proto use node 20
proto use node latest
```

## Version Management

### proto pin

Pin a version to `.prototools`.

```bash
proto pin node 20.10.0           # Pin locally
proto pin node 20 --global       # Pin globally
proto pin node 20 --to user      # Pin to ~/.prototools
```

### proto unpin

Remove a pinned version.

```bash
proto unpin node
proto unpin node --global
```

### proto versions

List available versions for a tool.

```bash
proto versions node              # All versions (installed marked)
```

### proto outdated

Check for version updates.

```bash
proto outdated                   # Check all tools
proto outdated --config-mode all # Include global
proto outdated --update          # Update .prototools
proto outdated --update --latest # Update to latest
proto outdated --json            # JSON output
```

## Plugin Commands

### proto plugin add

Register a plugin.

```bash
proto plugin add <name> <source>
proto plugin add atlas "https://example.com/atlas/plugin.toml"
```

### proto plugin remove

Unregister a plugin.

```bash
proto plugin remove atlas
```

### proto plugin list

List registered plugins.

```bash
proto plugin list                # All plugins
proto plugin list --versions     # With version info
proto plugin list node npm       # Specific plugins
```

### proto plugin info

Show plugin details.

```bash
proto plugin info node
```

## Alias Commands

### proto alias

Create a version alias.

```bash
proto alias node work 18.0.0     # Create 'work' alias
proto alias node lts 20.10.0     # Override 'lts'
```

### proto unalias

Remove an alias.

```bash
proto unalias node work
```

## Maintenance Commands

### proto clean

Remove unused tools and cache.

```bash
proto clean                      # Clean stale tools (30+ days unused)
proto clean plugins              # Clean plugins only
proto clean --days 7             # Custom threshold
```

### proto upgrade

Upgrade proto itself.

```bash
proto upgrade                    # Upgrade to latest
proto upgrade --check            # Check only
proto upgrade 0.50.0             # Specific version
```

### proto setup

Initialize proto in current shell.

```bash
proto setup                      # Configure shell
proto setup bash                 # Specific shell
proto setup --no-modify-profile  # Don't modify profile
```

## Debug Commands

### proto debug env

Show environment and configuration.

```bash
proto debug env
```

Output includes:

- Store paths (root, bins, shims, plugins, tools, temp)
- Proto version
- OS and architecture
- Config sources
- Virtual paths
- Environment variables

### proto debug config

Show resolved configuration.

```bash
proto debug config
proto debug config --json
```

## Activate Command

### proto activate

Generate shell activation script.

```bash
eval "$(proto activate bash)"    # Bash
eval "$(proto activate zsh)"     # Zsh
source (proto activate fish | psub)  # Fish
```

## Common Options

| Flag            | Description                                |
| --------------- | ------------------------------------------ |
| `--log <level>` | Log level: trace, debug, info, warn, error |
| `--json`        | JSON output (where supported)              |
| `--yes`, `-y`   | Skip confirmations                         |

## Environment Variables

| Variable          | Description                   |
| ----------------- | ----------------------------- |
| `PROTO_HOME`      | Installation directory        |
| `PROTO_LOG`       | Default log level             |
| `PROTO_*_VERSION` | Override version for tool     |
| `PROTO_ENV`       | Environment for config lookup |
