# Proto Configuration Reference

Complete reference for `.prototools` configuration.

## File Location

Proto searches for `.prototools` in this order:

1. Current directory
2. Parent directories (up to filesystem root)
3. User home: `~/.prototools`
4. Proto store: `~/.proto/.prototools`

## Version Pinning

```toml
# Exact versions (recommended for CI)
node = "20.10.0"
npm = "10.2.0"
pnpm = "8.12.0"
yarn = "4.0.0"
bun = "1.0.18"
deno = "1.40.0"
rust = "1.75.0"
go = "1.21.5"
python = "3.12.0"

# Pin proto itself
proto = "0.51.0"

# Partial versions (resolves to latest patch)
node = "20.10"
node = "20"

# Tilde (patch updates only)
node = "~20.10"

# Caret (minor updates)
node = "^20"

# Aliases
rust = "stable"
node = "lts"
```

## Plugin Configuration

```toml
[plugins]
# Remote TOML plugin
atlas = "https://raw.githubusercontent.com/example/plugin.toml"

# Remote WASM plugin
custom = "https://example.com/plugin.wasm"

# Local file (development)
dev-tool = "file://./target/wasm32-wasip1/debug/plugin.wasm"

# From registry (when available)
# tool = "source:tool-name"
```

## Settings

```toml
[settings]
# Auto-install missing tools on `proto run`
auto-install = true

# Auto-clean unused tools
auto-clean = true

# Disable telemetry
telemetry = false

# Version detection strategy
# first-available - Use first found (default)
# prefer-prototools - Prefer .prototools over ecosystem files
# only-prototools - Only use .prototools
detect-strategy = "prefer-prototools"
```

## HTTP Settings

```toml
[settings.http]
# Proxy configuration
proxies = ["https://internal.proxy", "https://corp.net/proxy"]

# Mark proxies as secure (bypass SSL checks)
secure-proxies = ["http://internal.proxy"]

# Custom root certificate
root-cert = "/path/to/root/cert.pem"
```

## Offline Settings

```toml
[settings.offline]
# Timeout for connectivity check (milliseconds)
timeout = 500
```

## Environment Variables

```toml
[env]
# Set environment variables
DEBUG = "*"
NODE_ENV = "development"

# Variable substitution
API_URL = "${BASE_URL}/api"

# Unset a variable
UNWANTED_VAR = false
```

## Environment-Specific Configuration

Use `PROTO_ENV` for environment-specific configs:

```bash
PROTO_ENV=production proto run node
```

Lookup order with `PROTO_ENV=production`:

1. `./.prototools.production`
2. `./.prototools`
3. `~/.prototools.production`
4. `~/.prototools`
5. `~/.proto/.prototools`

## Per-Tool Settings

```toml
[tools.node]
# Tool-specific configuration
aliases = { lts = "20.10.0", current = "21.0.0" }

[tools.node.env]
# Environment variables for this tool only
NODE_OPTIONS = "--max-old-space-size=4096"
```

## Environment Variables Reference

| Variable                     | Description                                  |
| ---------------------------- | -------------------------------------------- |
| `PROTO_HOME`                 | Installation directory (default: `~/.proto`) |
| `PROTO_LOG`                  | Log level (trace, debug, info, warn, error)  |
| `PROTO_WASM_LOG`             | WASM plugin log level                        |
| `PROTO_CACHE`                | Cache behavior (`off` to disable)            |
| `PROTO_ENV`                  | Environment name for config lookup           |
| `PROTO_*_VERSION`            | Override version for tool                    |
| `PROTO_BYPASS_VERSION_CHECK` | Skip version validation                      |
| `PROTO_OFFLINE_TIMEOUT`      | Connectivity check timeout                   |

## Complete Example

```toml
# .prototools

# Tool versions
node = "20.10.0"
npm = "10.2.0"
pnpm = "8.12.0"
rust = "1.75.0"
python = "3.12.0"
go = "1.21.5"
proto = "0.51.0"

# Third-party plugins
[plugins]
atlas = "https://raw.githubusercontent.com/crashdump/proto-tools/main/toml-plugins/atlas/plugin.toml"
pkl = "https://raw.githubusercontent.com/milesj/proto-plugins/master/pkl.toml"

# Global settings
[settings]
auto-install = true
auto-clean = true
detect-strategy = "prefer-prototools"
telemetry = false

# Network configuration
[settings.http]
proxies = ["https://corporate.proxy:8080"]

# Environment variables
[env]
NODE_ENV = "development"
RUST_BACKTRACE = "1"
```
