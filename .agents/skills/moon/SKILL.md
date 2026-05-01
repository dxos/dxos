---
name: moon
description: This skill should be used when the user asks to "configure moon", "set up moonrepo", "create moon tasks", "run moon commands", "configure moon workspace", "add moon project", "moon ci setup", "moon docker", "moon query", "migrate to moon v2", or mentions moon.yml, .moon/workspace.yml, .moon/toolchains.yml, moon run, moon ci, or moonrepo in general.
---

# moon - Polyglot Monorepo Build System

moon is a Rust-based repository management, task orchestration, and build system for polyglot monorepos. It provides smart caching, dependency-aware task execution, and unified toolchain management.

> **moon v2 is now available.** Run `moon migrate v2` to migrate. See `references/v2-migration.md` for breaking changes.

## When to Use moon

- Managing monorepos with multiple projects/packages
- Orchestrating tasks across projects with dependencies
- Caching build outputs for faster CI/local builds
- Managing toolchain versions (Node.js, Rust, Python, Go, etc.)
- Generating project and action graphs

## Quick Reference

### Core Commands

```bash
moon run <target>          # Run task(s)
moon run :lint             # Run in all projects
moon run '#tag:test'       # Run by tag
moon ci                    # CI-optimized execution
moon check --all           # Run all build/test tasks
moon query projects        # List projects
moon project-graph         # Visualize dependencies
```

### Target Syntax

| Pattern        | Description                     |
| -------------- | ------------------------------- |
| `project:task` | Specific project and task       |
| `:task`        | All projects with this task     |
| `#tag:task`    | Projects with tag               |
| `^:task`       | Upstream dependencies (in deps) |
| `~:task`       | Current project (in configs)    |

### Configuration Files

| File                   | Purpose                                  |
| ---------------------- | ---------------------------------------- |
| `.moon/workspace.yml`  | Workspace settings, project discovery    |
| `.moon/toolchains.yml` | Language versions, package managers (v2) |
| `.moon/tasks/*.yml`    | Global inherited tasks (v2)              |
| `moon.yml`             | Project-level config and tasks           |

> **v2 Note:** `.moon/toolchain.yml` → `.moon/toolchains.yml` (plural), `.moon/tasks.yml` → `.moon/tasks/*.yml`

## Workspace Configuration

```yaml
# .moon/workspace.yml
$schema: "https://moonrepo.dev/schemas/workspace.json"

projects:
  - "apps/*"
  - "packages/*"

vcs:
  client: "git"
  defaultBranch: "main"

pipeline:
  archivableTargets:
    - ":build"
  cacheLifetime: "7 days"
```

## Project Configuration

```yaml
# moon.yml
$schema: "https://moonrepo.dev/schemas/project.json"

language: "typescript"
layer: "application" # v2: 'type' renamed to 'layer'
stack: "frontend"
tags: ["react", "graphql"]

dependsOn:
  - "shared-utils"
  - id: "api-client"
    scope: "production"

fileGroups:
  sources:
    - "src/**/*"
  tests:
    - "tests/**/*"

tasks:
  build:
    command: "vite build"
    inputs:
      - "@group(sources)"
    outputs:
      - "dist"
    deps:
      - "^:build"

  dev:
    command: "vite dev"
    preset: "server"

  # v2: Use 'script' for shell features (pipes, redirects)
  lint:
    script: "eslint . && prettier --check ."

  test:
    command: "vitest run"
    inputs:
      - "@group(sources)"
      - "@group(tests)"
```

### Layer Types (v2)

| Layer           | Description           |
| --------------- | --------------------- |
| `application`   | Apps, services        |
| `library`       | Shareable code        |
| `tool`          | CLIs, scripts         |
| `automation`    | E2E/integration tests |
| `scaffolding`   | Templates, generators |
| `configuration` | Infra, config         |

## Task Configuration

### Task Fields

| Field     | Description                          |
| --------- | ------------------------------------ |
| `command` | Command to execute (string or array) |
| `args`    | Additional arguments                 |
| `deps`    | Task dependencies                    |
| `inputs`  | Files for cache hashing              |
| `outputs` | Files to cache                       |
| `env`     | Environment variables                |
| `extends` | Inherit from another task            |
| `preset`  | `server` or `utility`                |

### Task Inheritance

Tasks can be inherited globally via `.moon/tasks/*.yml`:

```yaml
# .moon/tasks/node.yml
inheritedBy:
  toolchains: ["javascript", "typescript"]

fileGroups:
  sources: ["src/**/*"]

tasks:
  lint:
    command: "eslint ."
    inputs: ["@group(sources)"]
```

Projects control inheritance:

```yaml
# moon.yml
workspace:
  inheritedTasks:
    include: ["lint", "test"]
    exclude: ["deploy"]
    rename:
      buildApp: "build"
```

### Task Options

```yaml
tasks:
  example:
    command: "cmd"
    options:
      cache: true # Enable caching
      runInCI: "affected" # affected, always, only, false
      persistent: true # Long-running process
      retryCount: 2 # Retry on failure
      timeout: 300 # Seconds
      mutex: "resource" # Exclusive lock
      priority: "high" # critical, high, normal, low
```

### Input Tokens

```yaml
inputs:
  - "@group(sources)" # File group
  - "@globs(tests)" # Glob patterns
  - "/tsconfig.base.json" # Workspace root file
  - "$NODE_ENV" # Environment variable
```

## Toolchain Configuration

```yaml
# .moon/toolchains.yml (v2: plural)
$schema: "https://moonrepo.dev/schemas/toolchains.json"

# JavaScript ecosystem (v2: required for node/bun/deno)
javascript:
  packageManager: "pnpm"
  inferTasksFromScripts: false

node:
  version: "20.10.0"

pnpm:
  version: "8.12.0"

# Alternative runtimes
bun:
  version: "1.0.0"

deno:
  version: "1.40.0"

typescript:
  syncProjectReferences: true
  routeOutDirToCache: true

rust:
  version: "1.75.0"
  bins: ["cargo-nextest", "cargo-llvm-cov"]

go:
  version: "1.21.0"

python:
  version: "3.12.0"
```

### Toolchain Tiers

| Tier | Description            | Examples                             |
| ---- | ---------------------- | ------------------------------------ |
| 3    | Full management        | Node.js, Bun, Deno, Rust, Go, Python |
| 2    | Ecosystem integration  | PHP, Ruby                            |
| 1    | Project categorization | Bash, Batch                          |
| 0    | System execution       | Custom tools                         |

## CI Integration

```yaml
# GitHub Actions
- uses: actions/checkout@v4
  with:
    fetch-depth: 0 # Required for affected detection

- uses: moonrepo/setup-toolchain@v0
  with:
    auto-install: true

- run: moon ci :build :test

- uses: moonrepo/run-report-action@v1
  if: success() || failure()
  with:
    access-token: ${{ secrets.GITHUB_TOKEN }}
```

### Parallelization with Matrix

```yaml
strategy:
  matrix:
    shard: [0, 1, 2, 3]

steps:
  - run: moon ci --job ${{ matrix.shard }} --job-total 4
```

### Affected Detection

```bash
moon run :test --affected             # Only affected projects
moon run :lint --affected --status staged  # Only staged files
moon ci :test --base origin/main      # Compare against base
moon query changed-files              # v2: renamed from touched-files
```

## Docker Support

```bash
moon docker scaffold <project>     # Generate Docker layers
moon docker setup                  # Install toolchain in Docker
moon docker prune                  # Prune for production
moon docker file <project>         # Generate Dockerfile
```

## Moon Query Language (MQL)

```bash
# Filter projects
moon query projects "language=typescript && projectType=library"
moon run :build --query "tag=react"

# Operators: =, !=, ~, !~, &&, ||
# Fields: project, language, stack, tag, task, taskType
```

## Additional Resources

For detailed configuration options, consult:

- **`references/workspace-config.md`** - Complete workspace.yml reference
- **`references/task-config.md`** - Task configuration and inheritance patterns
- **`references/v2-migration.md`** - v1 to v2 migration guide
- **`references/cli-reference.md`** - Full CLI command reference

### Examples

- **`examples/workspace.yml`** - Complete workspace configuration
- **`examples/moon.yml`** - Full project configuration
- **`examples/ci-workflow.yml`** - GitHub Actions CI workflow
