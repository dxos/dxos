# Moon Task Configuration Reference

Complete reference for task configuration in moon.yml and .moon/tasks.yml.

## Global Task Inheritance

### Configuration Hierarchy

```
.moon/tasks.yml              # Inherited by ALL projects (legacy)
.moon/tasks/*.yml            # Conditional inheritance based on conditions
└── moon.yml                 # Project-level tasks (override/merge)
```

### Global Tasks File Structure

```yaml
# .moon/tasks/node.yml
$schema: "https://moonrepo.dev/schemas/tasks.json"

# External configuration to extend
extends: "https://raw.githubusercontent.com/org/repo/main/.moon/tasks/base.yml"

# Conditions for which projects inherit these tasks
inheritedBy:
  toolchains:
    or: ["javascript", "typescript"]
  stacks: ["frontend", "backend"]
  layers: ["application", "library"]

# File groups inherited by matching projects
fileGroups:
  configs:
    - "*.config.{js,cjs,mjs,ts}"
    - "tsconfig*.json"
  sources:
    - "src/**/*"
    - "types/**/*"
  tests:
    - "tests/**/*"
    - "**/__tests__/**/*"
    - "**/*.test.{ts,tsx}"

# Default options for all tasks in this file
taskOptions:
  cache: true
  runInCI: "affected"

# Implicit dependencies added to ALL tasks
implicitDeps:
  - "^:build" # Run upstream builds first

# Implicit inputs added to ALL tasks
implicitInputs:
  - "package.json"
  - "/tsconfig.base.json"

# Tasks inherited by matching projects
tasks:
  lint:
    command: "eslint ."
    inputs:
      - "@group(sources)"

  test:
    command: "vitest run"
    inputs:
      - "@group(sources)"
      - "@group(tests)"
```

### Inheritance Conditions

Projects inherit tasks when ALL specified conditions match (AND logic between condition types):

| Condition    | Description                 | Example                              |
| ------------ | --------------------------- | ------------------------------------ |
| `toolchains` | Project toolchain           | `['javascript', 'typescript']`       |
| `stacks`     | Project stack               | `['frontend', 'backend']`            |
| `layers`     | Project layer               | `['application', 'library', 'tool']` |
| `tags`       | Project tags                | `['react', 'graphql']`               |
| `languages`  | Project language            | `['python', 'go']`                   |
| `files`      | Files that exist in project | `['Cargo.toml']`                     |

#### Condition Operators

```yaml
inheritedBy:
  # Simple array (OR within condition)
  stacks: ["frontend", "backend"]

  # With operators (tags and toolchains support this)
  toolchains:
    or: ["javascript", "typescript"] # Match any
    not: ["ruby"] # Exclude

  tags:
    and: ["react", "typescript"] # Match all
    or: ["web", "mobile"] # Match any
    not: ["deprecated"] # Exclude
```

#### Scoped Task Files

Convention-based file names for automatic inheritance:

| File                                  | Inherits When          |
| ------------------------------------- | ---------------------- |
| `.moon/tasks/all.yml`                 | All projects           |
| `.moon/tasks/node.yml`                | `toolchain: node`      |
| `.moon/tasks/typescript.yml`          | `language: typescript` |
| `.moon/tasks/frontend.yml`            | `stack: frontend`      |
| `.moon/tasks/library.yml`             | `layer: library`       |
| `.moon/tasks/tag-react.yml`           | `tags: ['react']`      |
| `.moon/tasks/typescript-frontend.yml` | Both conditions        |

## Task Definition

```yaml
tasks:
  build:
    # Command to execute (string or array)
    command: 'webpack build --mode production'
    # OR
    command:
      - 'webpack'
      - 'build'
      - '--mode'
      - 'production'

    # Additional arguments
    args:
      - '--color'
      - '--progress'

    # Alternative: shell script (supports pipes, redirects)
    script: 'rm -rf dist && webpack build > build.log'

    # Environment variables
    env:
      NODE_ENV: 'production'
      API_URL: '${BACKEND_URL}/api'

    # Task dependencies
    deps:
      - 'shared:build'        # Specific project
      - '~:codegen'           # Same project
      - '^:build'             # All upstream deps
      - target: 'optional:task'
        optional: true        # Don't fail if missing

    # Input files for hash calculation
    inputs:
      - 'src/**/*'
      - '@group(sources)'     # File group
      - '/tsconfig.base.json' # Workspace root
      - '$NODE_ENV'           # Env variable

    # Output files to cache
    outputs:
      - 'dist'
      - 'build/**/*.js'

    # Inherit from another task
    extends: 'base-build'

    # Task preset (server, watcher)
    preset: 'server'

    # Toolchain override
    toolchain: 'node'

    # Task options
    options:
      cache: true
      runInCI: 'affected'
```

## Task Options Reference

### Caching

| Option          | Type                             | Default | Description                       |
| --------------- | -------------------------------- | ------- | --------------------------------- |
| `cache`         | `boolean \| 'local' \| 'remote'` | `true`  | Enable/configure caching          |
| `cacheKey`      | `string`                         | -       | Custom cache invalidation key     |
| `cacheLifetime` | `string`                         | -       | Cache expiration (e.g., '7 days') |

### Execution

| Option                 | Type                                        | Default      | Description                   |
| ---------------------- | ------------------------------------------- | ------------ | ----------------------------- |
| `persistent`           | `boolean`                                   | `false`      | Long-running task (servers)   |
| `runInCI`              | `'affected' \| 'always' \| 'only' \| false` | `'affected'` | CI behavior                   |
| `runFromWorkspaceRoot` | `boolean`                                   | `false`      | Execute from workspace root   |
| `runDepsInParallel`    | `boolean`                                   | `true`       | Parallel dependency execution |
| `timeout`              | `number`                                    | -            | Max runtime in seconds        |
| `retryCount`           | `number`                                    | `0`          | Retry attempts on failure     |
| `priority`             | `'critical' \| 'high' \| 'normal' \| 'low'` | `'normal'`   | Queue priority                |

### Shell

| Option      | Type      | Default | Description                      |
| ----------- | --------- | ------- | -------------------------------- |
| `shell`     | `boolean` | varies  | Run in shell                     |
| `unixShell` | `string`  | -       | Shell: bash, zsh, fish, nu, etc. |

### Environment

| Option    | Type                            | Description       |
| --------- | ------------------------------- | ----------------- |
| `envFile` | `boolean \| string \| string[]` | Load .env file(s) |

### Output

| Option        | Type                                                                | Description    |
| ------------- | ------------------------------------------------------------------- | -------------- |
| `outputStyle` | `'buffer' \| 'buffer-only-failure' \| 'hash' \| 'none' \| 'stream'` | Output display |

### Special Modes

| Option         | Type                 | Default | Description                           |
| -------------- | -------------------- | ------- | ------------------------------------- |
| `internal`     | `boolean`            | `false` | Only run as dependency                |
| `interactive`  | `boolean`            | `false` | Requires stdin                        |
| `allowFailure` | `boolean`            | `false` | Can fail without failing pipeline     |
| `os`           | `string \| string[]` | -       | OS restriction: linux, macos, windows |
| `mutex`        | `string`             | -       | Exclusive resource lock               |
| `inferInputs`  | `boolean`            | `true`  | Auto-infer from @group tokens         |

### Merge Strategies

| Option         | Values                                          | Default    |
| -------------- | ----------------------------------------------- | ---------- |
| `mergeArgs`    | `'append' \| 'prepend' \| 'replace'`            | `'append'` |
| `mergeDeps`    | `'append' \| 'prepend' \| 'replace'`            | `'append'` |
| `mergeEnv`     | `'append' \| 'prepend' \| 'replace' \| 'union'` | `'append'` |
| `mergeInputs`  | `'append' \| 'prepend' \| 'replace'`            | `'append'` |
| `mergeOutputs` | `'append' \| 'prepend' \| 'replace'`            | `'append'` |

## Token Variables

### Project Variables

| Variable         | Description                  |
| ---------------- | ---------------------------- |
| `$project`       | Project ID                   |
| `$projectRoot`   | Absolute path to project     |
| `$projectSource` | Relative path from workspace |
| `$projectName`   | Human-readable name          |
| `$language`      | Project language             |

### Environment Variables

| Variable         | Description                              |
| ---------------- | ---------------------------------------- |
| `$arch`          | Host architecture (aarch64, x86_64)      |
| `$os`            | Operating system (linux, macos, windows) |
| `$osFamily`      | OS family (unix, windows)                |
| `$workspaceRoot` | Workspace root path                      |
| `$workingDir`    | Current working directory                |

## Task Extension (extends)

The `extends` field allows tasks to inherit from sibling tasks or globally inherited tasks.

### Basic Extension

```yaml
tasks:
  # Base task
  lint:
    command: "eslint ."
    inputs:
      - "@group(sources)"
    options:
      cache: true

  # Extended task - inherits all settings from lint
  lint-fix:
    extends: "lint"
    args: "--fix"
    preset: "utility" # Disable cache, enable interactive
```

### Extension with Overrides

```yaml
tasks:
  build:
    command: "vite build"
    inputs:
      - "@group(sources)"
      - "@group(configs)"
    outputs:
      - "dist"
    env:
      NODE_ENV: "production"
    options:
      cache: true

  # Development build - overrides specific settings
  build-dev:
    extends: "build"
    args: "--mode development"
    env:
      NODE_ENV: "development"
    options:
      cache: false
      mergeArgs: "replace" # Don't append, replace args
```

### Extending Inherited Tasks

Project tasks can extend globally inherited tasks:

```yaml
# .moon/tasks/node.yml (global)
tasks:
  test:
    command: 'vitest run'
    inputs: ['@group(sources)', '@group(tests)']

# apps/web/moon.yml (project)
tasks:
  test-e2e:
    extends: 'test'           # Extends the inherited 'test' task
    args: '--project=e2e'
    options:
      timeout: 600
```

## Task Presets

Presets are predefined option sets for common task patterns.

### Available Presets

| Preset    | cache   | outputStyle | persistent | interactive | runInCI |
| --------- | ------- | ----------- | ---------- | ----------- | ------- |
| `server`  | `false` | `stream`    | `true`     | -           | `false` |
| `utility` | `false` | `stream`    | `false`    | `true`      | `skip`  |

### Auto-Applied Presets

Tasks named `dev`, `start`, or `serve` automatically get the `server` preset.

### Preset Usage

```yaml
tasks:
  # Long-running development server
  dev:
    command: "vite dev"
    preset: "server" # No cache, streams output, persistent

  # Interactive utility command
  migrate:
    command: "prisma migrate dev"
    preset: "utility" # No cache, streams output, interactive

  # Override preset defaults
  watch:
    command: "tsc --watch"
    preset: "server"
    options:
      runInCI: "skip" # Override the preset's runInCI: false
```

## Controlling Inherited Tasks

Projects can filter, exclude, or rename inherited tasks.

### Include (Allowlist)

```yaml
# moon.yml
workspace:
  inheritedTasks:
    include:
      - "lint"
      - "test"
    # Only these tasks are inherited; all others excluded
```

### Exclude (Blocklist)

```yaml
workspace:
  inheritedTasks:
    exclude:
      - "deploy"
      - "publish"
    # All tasks inherited except these
```

### Rename

```yaml
workspace:
  inheritedTasks:
    rename:
      buildApplication: "build" # Use shorter name locally
      testUnit: "test"
```

### Combined Example

```yaml
# moon.yml
workspace:
  inheritedTasks:
    include: ["lint", "test", "build", "buildApplication"]
    exclude: ["test"] # Applied after include
    rename:
      buildApplication: "build" # Applied last
# Result: only 'lint' and 'build' tasks inherited
```

### Processing Order

1. **Include** - Filter to only specified tasks
2. **Exclude** - Remove specific tasks from the filtered set
3. **Rename** - Apply name mappings to remaining tasks

## File Groups

File groups organize related files for reuse across tasks.

### Defining File Groups

```yaml
fileGroups:
  # Source files
  sources:
    - "src/**/*"
    - "lib/**/*"

  # Test files
  tests:
    - "tests/**/*"
    - "**/__tests__/**/*"
    - "**/*.test.{ts,tsx,js,jsx}"
    - "**/*.spec.{ts,tsx,js,jsx}"

  # Configuration files
  configs:
    - "*.config.{js,cjs,mjs,ts}"
    - "tsconfig*.json"
    - "package.json"

  # Static assets
  assets:
    - "public/**/*"
    - "static/**/*"

  # Everything lintable
  lintable:
    - "@group(sources)"
    - "@group(tests)"
    - "@group(configs)"

  # Negation patterns
  production:
    - "src/**/*"
    - "!src/**/*.test.*"
    - "!src/**/__mocks__/**"
```

### Using File Groups

```yaml
tasks:
  lint:
    command: "eslint"
    args:
      - "@globs(lintable)" # Glob patterns as arguments
    inputs:
      - "@group(lintable)" # For cache hashing

  typecheck:
    command: "tsc --noEmit"
    inputs:
      - "@group(sources)"
      - "@group(configs)"

  test:
    command: "vitest run"
    args:
      - "@files(tests)" # Expanded file paths
    inputs:
      - "@group(sources)"
      - "@group(tests)"
```

### Token Functions for File Groups

| Token          | Description         | Use Case       |
| -------------- | ------------------- | -------------- |
| `@group(name)` | All items in group  | Inputs/outputs |
| `@globs(name)` | Glob patterns       | Command args   |
| `@files(name)` | Expanded file paths | Command args   |
| `@dirs(name)`  | Directory paths     | Command args   |

### File Group Inheritance

File groups defined in `.moon/tasks/*.yml` are inherited by matching projects. Project-level groups override inherited groups of the same name.

```yaml
# .moon/tasks/node.yml
fileGroups:
  sources:
    - 'src/**/*'

# apps/api/moon.yml - overrides inherited 'sources'
fileGroups:
  sources:
    - 'src/**/*'
    - 'generated/**/*'   # Project-specific addition
```

## Merge Strategies

Control how inherited and extended task values combine.

### Strategy Options

| Strategy  | Behavior                                     |
| --------- | -------------------------------------------- |
| `append`  | Local values added after inherited (default) |
| `prepend` | Local values added before inherited          |
| `replace` | Local values completely override inherited   |

### Configuring Merge Strategies

```yaml
tasks:
  build:
    command: "webpack"
    args: ["--mode", "production"]
    deps: ["codegen"]
    inputs: ["src/**/*"]
    options:
      mergeArgs: "replace" # Completely replace inherited args
      mergeDeps: "prepend" # Run local deps before inherited
      mergeEnv: "append" # Add to inherited env vars
      mergeInputs: "append" # Combine with inherited inputs
      mergeOutputs: "replace" # Override inherited outputs
```

### Merge Fields

| Option            | Applies To         |
| ----------------- | ------------------ |
| `mergeArgs`       | `args` array       |
| `mergeDeps`       | `deps` array       |
| `mergeEnv`        | `env` map          |
| `mergeInputs`     | `inputs` array     |
| `mergeOutputs`    | `outputs` array    |
| `mergeToolchains` | `toolchains` array |

### Example: Merge Behavior

```yaml
# Inherited task
tasks:
  test:
    command: 'vitest'
    args: ['run']
    deps: ['^:build']
    inputs: ['src/**/*']

# Project task with mergeArgs: 'append' (default)
tasks:
  test:
    args: ['--coverage']
    # Result: ['run', '--coverage']

# Project task with mergeArgs: 'prepend'
tasks:
  test:
    args: ['--coverage']
    options:
      mergeArgs: 'prepend'
    # Result: ['--coverage', 'run']

# Project task with mergeArgs: 'replace'
tasks:
  test:
    args: ['--coverage']
    options:
      mergeArgs: 'replace'
    # Result: ['--coverage']
```

## Implicit Dependencies and Inputs

Always inherited regardless of merge settings.

### implicitDeps

Dependencies added to ALL inherited tasks:

```yaml
# .moon/tasks/node.yml
implicitDeps:
  - "^:build" # Always build dependencies first
  - "~:codegen" # Always run codegen in same project
```

### implicitInputs

Input files added to ALL inherited tasks:

```yaml
# .moon/tasks/node.yml
implicitInputs:
  - "package.json"
  - "/tsconfig.base.json" # Workspace root
  - "/.moon/toolchains.yml" # Workspace config (v2: plural)
```

## External Configuration (extends)

### Extending Remote Configuration

```yaml
# .moon/tasks/node.yml
extends: "https://raw.githubusercontent.com/company/configs/main/.moon/tasks/base.yml"

# Local overrides and additions
tasks:
  custom:
    command: "custom-tool"
```

### Extending Local Configuration

```yaml
extends: "../shared/base-tasks.yml"
```

### Versioning Remote Configs

```yaml
# Pin to specific commit for stability
extends: 'https://raw.githubusercontent.com/company/configs/abc1234/.moon/tasks/base.yml'

# Or use versioned filenames
extends: 'https://raw.githubusercontent.com/company/configs/main/tasks-v2.yml'
```

### Merge Behavior

When extending, local values take precedence. Map entries (fileGroups, tasks) merge at the top level only.

```yaml
# Remote base.yml
fileGroups:
  sources:
    - 'src/**/*'
tasks:
  lint:
    command: 'eslint'

# Local override
fileGroups:
  sources:         # Completely replaces remote 'sources'
    - 'lib/**/*'
  tests:           # Added (not in remote)
    - 'tests/**/*'
tasks:
  lint:            # Completely replaces remote 'lint'
    command: 'biome lint'
  test:            # Added (not in remote)
    command: 'vitest'
```

## runInCI Values

| Value                 | Description                    |
| --------------------- | ------------------------------ |
| `'affected'` / `true` | Run if affected (default)      |
| `'always'`            | Always run in CI               |
| `false`               | Never run in CI                |
| `'only'`              | Only in CI, not locally        |
| `'skip'`              | Skip in CI, keep relationships |

## Common Patterns

### Build with Dependencies

```yaml
tasks:
  build:
    command: "tsc"
    deps:
      - "^:build" # Build all dependencies first
    inputs:
      - "@group(sources)"
    outputs:
      - "dist"
```

### Development Server

```yaml
tasks:
  dev:
    command: "vite dev"
    preset: "server" # Sets persistent, no cache, no CI
```

### Serial Dependencies

```yaml
tasks:
  deploy:
    command: "./deploy.sh"
    deps:
      - "clean"
      - "build"
      - "test"
    options:
      runDepsInParallel: false # Run in order
```

### Conditional Execution

```yaml
tasks:
  build-linux:
    command: "./build-linux.sh"
    options:
      os: "linux"

  e2e:
    command: "playwright test"
    options:
      runInCI: "always"
      timeout: 600
      retryCount: 2
```
