# Moon v2 Migration Reference

Complete guide for migrating from moon v1 to v2.

## Migration Command

```bash
moon migrate v2
```

This automates applicable configuration changes.

## Breaking Changes Summary

### Configuration File Renames

| v1                       | v2                              |
| ------------------------ | ------------------------------- |
| `.moon/toolchain.yml`    | `.moon/toolchains.yml` (plural) |
| `.moon/tasks.yml`        | `.moon/tasks/all.yml`           |
| `.moon/docker/workspace` | `.moon/docker/configs`          |

### Workspace Settings (`.moon/workspace.yml`)

| v1                     | v2                |
| ---------------------- | ----------------- |
| `runner`               | `pipeline`        |
| `codeowners.syncOnRun` | `codeowners.sync` |
| `vcs.manager`          | `vcs.client`      |
| `unstable_remote`      | `remote`          |
| `hasher.batchSize`     | Removed           |
| `experiments`          | Removed           |

### Project Settings (`moon.yml`)

| v1                                    | v2                            |
| ------------------------------------- | ----------------------------- |
| `type`                                | `layer`                       |
| `project.name`                        | `project.title`               |
| `platform`                            | `toolchains.default`          |
| `project.metadata`                    | Removed (use root fields)     |
| `toolchain.typescript.disabled: true` | `toolchains.typescript: null` |

### Task Settings

| v1                           | v2                                            |
| ---------------------------- | --------------------------------------------- |
| `tasks.*.local`              | `tasks.*.preset: server`                      |
| `tasks.*.platform`           | `tasks.*.toolchains`                          |
| `options.affectedPassInputs` | `options.affectedFiles.passInputsWhenNoMatch` |

### Token Variables

| v1              | v2               |
| --------------- | ---------------- |
| `$projectName`  | `$projectTitle`  |
| `$projectType`  | `$projectLayer`  |
| `$taskPlatform` | `$taskToolchain` |

## Script vs Command

Complex shell operations now require `script` instead of `command`:

```yaml
# v1 - command with pipes (worked)
tasks:
  example:
    command: 'echo "foo" | grep "f"'

# v2 - must use script for shell features
tasks:
  example:
    script: 'echo "foo" | grep "f"'
```

**When to use script:**

- Pipes (`|`)
- Redirects (`>`, `<`, `>>`)
- Chaining (`&&`, `||`, `;`)
- Shell globbing
- Environment expansion in complex expressions

**When to use command:**

- Simple commands without shell features
- Commands with arguments

## Shell Enabled by Default

Tasks now run in shells (Bash on Unix, pwsh on Windows). To disable:

```yaml
tasks:
  example:
    command: "tool"
    options:
      shell: false
```

## Project Layers (Formerly Type)

New categorization system:

| Layer           | Description                   |
| --------------- | ----------------------------- |
| `application`   | Any kind of application       |
| `automation`    | E2E/integration/visual tests  |
| `configuration` | Infrastructure and config     |
| `library`       | Shareable, publishable code   |
| `scaffolding`   | Templates or generators       |
| `tool`          | Internal tools, CLIs, scripts |
| `unknown`       | Default when unconfigured     |

## Default Project

Configure fallback project when running tasks without scope:

```yaml
# .moon/workspace.yml
defaultProject: "core-app"
```

Usage:

- `:task` without project scope runs on default project
- `~:task` runs on closest project (previous behavior)

## Toolchain Configuration Changes

### v1 Structure (Nested)

```yaml
# .moon/toolchain.yml (v1)
node:
  version: "20.10.0"
  packageManager: "pnpm"
  pnpm:
    version: "8.0.0"
```

### v2 Structure (Flat)

```yaml
# .moon/toolchains.yml (v2)
javascript:
  packageManager: "pnpm"
  inferTasksFromScripts: true

node:
  version: "20.10.0"

pnpm:
  version: "8.0.0"
```

**Critical**: `bun`, `deno`, and `node` toolchains require `javascript` to be enabled:

```yaml
javascript: {} # Required!

bun:
  version: "1.0.0"
```

## WASM Extensions

Built-in extensions must be explicitly enabled:

```yaml
# .moon/extensions.yml
download: {}
migrate-nx: {}
migrate-turborepo: {}
unpack: {}
```

## VCS Hooks Location

Hooks now write to `.moon/hooks` instead of `.git/hooks`.

## Remote Caching

`unstable_remote` is now `remote`:

```yaml
# v1
unstable_remote:
  host: "grpcs://cache.example.com"

# v2
remote:
  host: "grpcs://cache.example.com"
```

## CLI Changes

| v1                          | v2                               |
| --------------------------- | -------------------------------- |
| `--logLevel`                | `--log-level` (kebab-case)       |
| `--platform`                | `--toolchain`                    |
| `moon node`                 | Removed                          |
| `moon query hash`           | `moon hash`                      |
| `moon query touched-files`  | `moon query changed-files`       |
| `moon run --profile`        | Removed                          |
| `moon generate <id> <dest>` | `moon generate <id> --to <dest>` |
| `moon init --tool`          | `moon toolchain add`             |

## Environment Variable Changes

- `MOON_AFFECTED_FILES` now uses OS path separator (`:` Unix, `;` Windows) instead of comma

## Removed Features

- `x86_64-apple-darwin` (Apple Intel) - Only Apple Silicon supported
- `moon node` command
- `project.metadata` setting
- `hasher.batchSize` setting
- `experiments` section
- Nested package manager config under `node`

## MCP Protocol Changes

- Updated protocol version to 2025-11-25
- `get_projects` returns project fragments (not full objects)
- `get_tasks` returns task fragments (not full objects)
- No more `includeTasks` option

## Deep Merge Behavior

Tasks now undergo deep merging (sequential) rather than shallow merging:

```yaml
# Base task
lint:
  command: 'eslint'
  args: ['--cache']
  inputs: ['src/**/*']

# Extended task - v2 merges deeply
lint:
  args: ['--fix']  # Results in ['--cache', '--fix']
```

## Migration Checklist

- [ ] Rename `.moon/toolchain.yml` to `.moon/toolchains.yml`
- [ ] Move `.moon/tasks.yml` to `.moon/tasks/all.yml`
- [ ] Update `runner` to `pipeline` in workspace.yml
- [ ] Update `type` to `layer` in project moon.yml files
- [ ] Update `local: true` to `preset: server`
- [ ] Update `platform` to `toolchains` in tasks
- [ ] Add `javascript: {}` if using node/bun/deno
- [ ] Update `unstable_remote` to `remote`
- [ ] Convert complex commands to use `script`
- [ ] Update CLI flags to kebab-case
- [ ] Enable required extensions in `.moon/extensions.yml`
- [ ] Run `moon migrate v2` to automate applicable changes
