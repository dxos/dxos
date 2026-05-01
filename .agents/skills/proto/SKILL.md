---
name: proto
description: This skill should be used when the user asks to "install proto", "configure proto", "manage tool versions", "pin versions", "set up .prototools", "install node version", "install rust version", "install python version", "proto plugins", or mentions proto commands, .prototools file, or multi-language version management.
---

# proto - Pluggable Multi-Language Version Manager

proto is a next-generation version manager for multiple programming languages. It provides a unified interface for managing Node.js, npm, pnpm, yarn, Bun, Deno, Rust, Go, Python, and 800+ tools via plugins.

## When to Use proto

- Managing language/tool versions across projects
- Pinning versions in `.prototools` for team consistency
- Installing and running tools without global pollution
- Replacing nvm, pyenv, rustup, gvm with a single tool

## Installation

```bash
# Linux, macOS, WSL
bash <(curl -fsSL https://moonrepo.dev/install/proto.sh)

# Specific version, non-interactive
bash <(curl -fsSL https://moonrepo.dev/install/proto.sh) 1.2.3 --yes
```

### Shell Setup

```bash
# Add to shell profile
eval "$(proto activate bash)"   # Bash
eval "$(proto activate zsh)"    # Zsh
```

## Quick Reference

### Core Commands

```bash
proto install <tool>           # Install tool
proto install node 20.10.0     # Install specific version
proto install node --build     # Build from source (v0.45+)
proto run <tool>               # Run with detected version
proto exec node pnpm -- cmd    # Bootstrap multi-tool env (v0.53+)
proto pin <tool> <version>     # Pin version locally
proto pin <tool> --global      # Pin globally
proto versions <tool>          # List available versions
proto outdated                 # Check for updates
proto clean                    # Remove unused tools
proto upgrade                  # Upgrade proto itself
proto diagnose                 # Identify installation issues
proto debug config             # List all .prototools files
proto debug env                # Show environment info
```

## Configuration: .prototools

```toml
# .prototools
node = "20.10.0"
npm = "10.2.0"
pnpm = "8.12.0"
yarn = "4.0.0"
bun = "1.0.0"
deno = "1.40.0"
rust = "1.75.0"
go = "1.21.0"
python = "3.12.0"

[plugins]
my-tool = "https://example.com/plugin.wasm"

[settings]
auto-install = true
auto-clean = true
detect-strategy = "prefer-prototools"

[env]
NODE_ENV = "development"
```

### Version Specifiers

| Format | Example     | Description             |
| ------ | ----------- | ----------------------- |
| Exact  | `"20.10.0"` | Exact version           |
| Major  | `"20"`      | Latest 20.x.x           |
| Tilde  | `"~20.10"`  | Patch updates only      |
| Alias  | `"stable"`  | Language-specific alias |

## Supported Tools (Built-in)

### JavaScript/TypeScript

```bash
proto install node     # Node.js runtime
proto install npm      # npm package manager
proto install pnpm     # pnpm package manager
proto install yarn     # Yarn package manager
proto install bun      # Bun runtime
proto install deno     # Deno runtime
```

### Systems Languages

```bash
proto install rust     # Rust (includes cargo)
proto install go       # Go
```

### Other

```bash
proto install python   # Python (includes pip)
```

## Version Detection Order

1. CLI argument: `proto run node 18.0.0`
2. Environment variable: `PROTO_NODE_VERSION=18.0.0`
3. Local `.prototools` (current + parent dirs)
4. Ecosystem files: `.nvmrc`, `.node-version`, `package.json` engines
5. Global `.prototools`: `~/.proto/.prototools`

## Common Workflows

### Pin Versions for Team

```bash
# Pin to local .prototools
proto pin node 20.10.0
proto pin pnpm 8.12.0

# Pin globally (user default)
proto pin node 20 --global
```

### Install All Tools

```bash
# Install everything from .prototools
proto install
```

### Check for Updates

```bash
proto outdated                    # Check for updates
proto outdated --update --latest  # Update .prototools
```

### Run with Specific Version

```bash
proto run node 18 -- script.js    # Override version
PROTO_NODE_VERSION=18 proto run node  # Via env var
```

### Proto Exec (v0.53+)

Bootstrap an environment with multiple tools:

```bash
# Run command with multiple tools
proto exec node@24 pnpm@10 ruby@3.4 -- pnpm run app:start

# Load tools from config
proto exec --tools-from-config -- npm test

# Interactive shell with activated tools
proto exec node pnpm -- bash
```

### Build From Source (v0.45+)

Compile tools from source (useful when pre-built binaries unavailable):

```bash
proto install ruby --build
proto install node --build
proto install python --build
```

Supported: Deno, Go, Moon, Node, Python, Ruby.

```toml
# .prototools
[settings.build]
install-system-packages = true
write-log-file = true
```

## Plugins

### Add Third-Party Plugin

```bash
proto plugin add atlas "https://raw.githubusercontent.com/.../plugin.toml"
proto install atlas
```

### List Plugins

```bash
proto plugin list           # Show all plugins
proto plugin list --versions  # With version info
```

### Plugin Sources

```toml
[plugins]
# Remote TOML plugin
atlas = "https://example.com/atlas/plugin.toml"

# Remote WASM plugin
custom = "https://example.com/plugin.wasm"

# GitHub releases (recommended for distribution)
my-tool = "github://org/repo"

# Local development (WASM)
local = "file://./target/wasm32-wasip1/release/plugin.wasm"
```

### WASM Plugin Development

Build plugins with `proto_pdk` crate targeting `wasm32-wasip1`:

```bash
# Build plugin
cargo build --target wasm32-wasip1 --release

# Test locally
proto install my-tool --log trace
```

Test configuration for local development:

```toml
# .prototools
[settings]
unstable-lockfile = true  # Create .protolock for consistency

[plugins.tools]
my-tool = "file://./target/wasm32-wasip1/release/my_tool.wasm"
```

Required WASM functions:

- `register_tool` - Metadata (name, type)
- `download_prebuilt` - Configure download/install
- `locate_executables` - Define executable paths
- `load_versions` - Fetch available versions

Optional: `native_install`, `detect_version_files`, `parse_version_file`

## Settings

```toml
[settings]
# Auto-install missing tools
auto-install = true

# Auto-clean unused tools
auto-clean = true

# Version detection strategy
# first-available, prefer-prototools, only-prototools
detect-strategy = "prefer-prototools"

# Pin "latest" alias to local or global config
pin-latest = "local"

# Create .protolock for reproducible installs
unstable-lockfile = true

# Disable telemetry
telemetry = false

[settings.http]
# Configure proxies
proxies = ["https://internal.proxy"]
root-cert = "/path/to/cert.pem"

[settings.offline]
timeout = 500  # ms
```

## Environment Variables

| Variable                     | Description                                  |
| ---------------------------- | -------------------------------------------- |
| `PROTO_HOME`                 | Installation directory (default: `~/.proto`) |
| `PROTO_LOG`                  | Log level (trace, debug, info, warn, error)  |
| `PROTO_*_VERSION`            | Override version for tool                    |
| `PROTO_ENV`                  | Environment for config lookup                |
| `PROTO_BYPASS_VERSION_CHECK` | Skip version validation                      |

### Development/Testing Variables

| Variable                     | Description                           |
| ---------------------------- | ------------------------------------- |
| `PROTO_TEST`                 | Enable test mode (loads test plugins) |
| `PROTO_DEBUG_COMMAND`        | Show detailed command execution       |
| `PROTO_DEBUG_WASM`           | Enable WASM plugin debugging          |
| `WASMTIME_BACKTRACE_DETAILS` | Detailed WASM backtraces              |

## Integration with moon

proto is the toolchain backend for moon. Configure in `.moon/toolchains.yml` (v2):

```yaml
# .moon/toolchains.yml
javascript:
  packageManager: "pnpm"

node:
  version: "20.10.0"
```

Or pin moon itself via proto:

```toml
# .prototools
moon = "1.31.0"
```

## CI/CD Integration

```yaml
# GitHub Actions
- uses: moonrepo/setup-toolchain@v0
  with:
    auto-install: true
```

## Additional Resources

For detailed configuration, consult:

- **`references/config.md`** - Complete .prototools reference
- **`references/plugins.md`** - Plugin development guide
- **`references/commands.md`** - Full CLI reference

### Examples

- **`examples/prototools-full.toml`** - Complete configuration
- **`examples/plugin.toml`** - TOML plugin example
