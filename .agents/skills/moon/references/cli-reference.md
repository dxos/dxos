# Moon CLI Reference

Complete reference for all moon CLI commands.

## Task Execution

### moon run

Execute targets and their dependencies.

```bash
moon run <target>... [-- <args>]
```

**Options:**

| Flag                   | Description                     |
| ---------------------- | ------------------------------- |
| `--affected`           | Only run if affected by changes |
| `--dependents`         | Also run downstream dependents  |
| `--force`              | Bypass cache                    |
| `--interactive`, `-i`  | Interactive task selection      |
| `--no-bail`            | Continue on failure             |
| `--query <mql>`        | Filter with MQL                 |
| `--remote`             | Compare against remote          |
| `--status <type>`      | Filter by status                |
| `--summary`            | Show execution summary          |
| `--update-cache`, `-u` | Force cache update              |

**Examples:**

```bash
moon run app:build
moon run :lint --affected
moon run '#frontend:test'
moon run app:test -- --coverage
moon run :build --query "language=typescript"
```

### moon check

Run all build/test tasks for projects.

```bash
moon check [project...]
moon check --all
```

### moon ci

CI-optimized task execution with job distribution.

```bash
moon ci [target...]
```

**Options:**

| Flag                  | Description             |
| --------------------- | ----------------------- |
| `--base <rev>`        | Base to compare against |
| `--head <rev>`        | Head revision           |
| `--job <index>`       | Job index (0-based)     |
| `--job-total <count>` | Total parallel jobs     |

**Examples:**

```bash
moon ci :build :test
moon ci :test --job 0 --job-total 4
moon ci --base origin/main --head HEAD
```

## Query Commands

### moon query projects

```bash
moon query projects [mql]
moon query projects --affected
moon query projects --tags frontend
moon query projects "language=typescript"
```

### moon query tasks

```bash
moon query tasks [mql]
moon query tasks --affected
moon query tasks "task~dev-*"
```

### moon query touched-files

```bash
moon query touched-files
moon query touched-files --status modified,staged
moon query touched-files --base main --head HEAD
```

### moon query hash

```bash
moon query hash <hash>
moon query hash-diff <left> <right>
```

## Graph Visualization

### moon project-graph

```bash
moon project-graph [project]
moon project-graph --dot > graph.dot
moon project-graph app --dependents
```

### moon action-graph

```bash
moon action-graph [target]
moon action-graph app:build --dot
```

## Workspace Management

### moon init

```bash
moon init
moon init node
moon init --minimal
moon init --to ./app
```

### moon sync

```bash
moon sync projects     # Sync all projects
moon sync hooks        # Sync VCS hooks
```

### moon setup

```bash
moon setup             # Install toolchain
```

### moon generate

```bash
moon generate <template> [dest] [-- vars]
moon generate npm-package ./packages/foo -- --name "@company/foo"
moon templates         # List available templates
```

## Docker Commands

```bash
moon docker scaffold <project>   # Generate Docker layers
moon docker setup                # Install in Docker
moon docker prune                # Prune for production
moon docker file <project>       # Generate Dockerfile
```

## Toolchain Commands

```bash
moon bin <tool>                  # Get tool binary path
moon toolchain add <name>        # Add toolchain
moon upgrade                     # Upgrade moon
```

## Extension Commands

```bash
moon ext <id> [-- args]          # Run extension
moon ext migrate-nx              # Migrate from Nx
moon ext migrate-turborepo       # Migrate from Turborepo
```

## Utility Commands

```bash
moon completions [--shell <shell>]  # Generate completions
```

## Global Flags

| Flag                | Description                                     |
| ------------------- | ----------------------------------------------- |
| `--color`           | Force color output                              |
| `--log <level>`     | Log level: off, error, warn, info, debug, trace |
| `--concurrency <n>` | Limit parallel execution                        |
| `--profile <type>`  | Generate profile (cpu, heap)                    |

## Moon Query Language (MQL)

### Operators

| Operator     | Description |
| ------------ | ----------- |
| `=`          | Equals      |
| `!=`         | Not equals  |
| `~`          | Like (glob) |
| `!~`         | Not like    |
| `&&`, `AND`  | Logical AND |
| `\|\|`, `OR` | Logical OR  |

### Fields

**Projects:** project, projectAlias, projectSource, projectType, language, layer, stack, tag

**Tasks:** task, taskCommand, taskType, taskToolchain

### Examples

```bash
moon query projects "language=typescript && projectType=library"
moon run :build --query "tag=react"
moon query projects "projectSource~packages/*"
```
