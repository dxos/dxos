# Moon Workspace Configuration Reference

Complete reference for `.moon/workspace.yml` configuration.

## Schema

```yaml
$schema: "https://moonrepo.dev/schemas/workspace.json"
```

## Projects

### Glob Patterns

```yaml
projects:
  - "apps/*"
  - "packages/*"
  - "tools/*"
  - "!packages/deprecated-*" # Exclusion
```

### Explicit Mapping

```yaml
projects:
  sources:
    app: "apps/web"
    api: "apps/api"
  globs:
    - "packages/*"
```

## VCS Configuration

```yaml
vcs:
  client: "git" # v2: 'manager' renamed to 'client'
  provider: "github" # github, gitlab, bitbucket, other
  defaultBranch: "main"
  remoteCandidates:
    - "origin"
    - "upstream"
  hooks:
    pre-commit:
      - "moon run :lint --affected --status staged"
    pre-push:
      - "moon run :test --affected"
```

> Note: In v2, VCS hooks write to `.moon/hooks` instead of `.git/hooks`.

## Pipeline Configuration (v2)

> Note: In v2, `runner` was renamed to `pipeline`.

```yaml
pipeline:
  # Targets to archive for caching
  archivableTargets:
    - ":build"
    - ":test"

  # Cache settings
  cacheLifetime: "7 days"
  autoCleanCache: true

  # Output settings
  inheritColorsForPipedTasks: true
  logRunningCommand: true

  # Execution
  concurrency: 8 # Parallel task limit

  # Dependency management
  installDependencies: true
  syncProjects: true
  syncWorkspace: true

  # Process control
  killProcessThreshold: 3
```

## Default Project (v2)

```yaml
# When running :task without project scope, use this project
defaultProject: "website"
```

## Hasher Configuration

```yaml
hasher:
  # Optimization mode
  optimization: "performance" # accuracy, performance

  # Walk strategy
  walkStrategy: "vcs" # glob, vcs

  # Ignore patterns
  ignoredPatterns:
    - "**/.git/**"
    - "**/node_modules/**"

  # Batch size for hashing
  batchSize: 2500
```

## Code Owners

```yaml
codeowners:
  globalPaths:
    "/*": ["@platform-team"]
    "/apps/*": ["@product-team"]
    "/packages/*": ["@library-team"]
  orderBy: "project-source"
  sync: true # v2: 'syncOnRun' renamed to 'sync'
```

## Constraints

```yaml
constraints:
  # Enforce layer relationships
  enforceProjectTypeRelationships: true

  # Tag-based dependency rules
  tagRelationships:
    frontend:
      requires: ["shared"]
      conflicts: ["backend-only"]
    backend:
      requires: ["shared"]
```

## Generator

```yaml
generator:
  templates:
    - "./templates"
    - "npm:@company/templates"
```

## Extensions

```yaml
extensions:
  migrate-nx:
    plugin: "https://example.com/migrate-nx.wasm"
  custom:
    plugin: "file://./extensions/custom.wasm"
```

## Remote Caching

> Note: In v2, `unstable_remote` is now `remote`.

```yaml
remote:
  host: "grpcs://cache.example.com"
  auth:
    token: "CACHE_TOKEN"
    headers:
      "X-Custom-Header": "value"
  cache:
    compression: "zstd"
    verifyIntegrity: true
    localReadOnly: false # Download only, no uploads (for dev)
```

### Self-Hosted with bazel-remote

```yaml
remote:
  host: "grpc://your-server:9092"
```

Run bazel-remote:

```bash
bazel-remote --dir /path/to/moon-cache --max_size 10 \
  --storage_mode zstd --grpc_address 0.0.0.0:9092
```

### TLS/mTLS Configuration

```yaml
remote:
  host: 'grpcs://your-host.com:9092'
  tls:
    cert: 'certs/ca.pem'
    domain: 'your-host.com'

# Or mTLS
remote:
  host: 'grpcs://your-host.com:9092'
  mtls:
    caCert: 'certs/ca.pem'
    clientCert: 'certs/client.pem'
    clientKey: 'certs/client.key'
    domain: 'your-host.com'
```

### Third-Party Providers

```yaml
# Depot
remote:
  host: "grpcs://cache.depot.dev"
  auth:
    token: "DEPOT_TOKEN"
    headers:
      "X-Depot-Org": "<org-id>"
      "X-Depot-Project": "<project-id>"
```

## Notifier

```yaml
notifier:
  webhookUrl: "https://hooks.slack.com/..."
```

## Telemetry

```yaml
telemetry: true # Enable usage telemetry
```

## Complete Example

```yaml
$schema: "https://moonrepo.dev/schemas/workspace.json"

projects:
  - "apps/*"
  - "packages/*"
  - "tools/*"

vcs:
  client: "git" # v2: 'manager' renamed to 'client'
  provider: "github"
  defaultBranch: "main"
  hooks:
    pre-commit:
      - "moon run :lint --affected --status staged"

pipeline: # v2: 'runner' renamed to 'pipeline'
  archivableTargets:
    - ":build"
  cacheLifetime: "7 days"
  inheritColorsForPipedTasks: true
  logRunningCommand: true
  autoCleanCache: true

hasher:
  optimization: "performance"
  walkStrategy: "vcs"

codeowners:
  globalPaths:
    "/*": ["@platform-team"]
  sync: true # v2: 'syncOnRun' renamed to 'sync'

constraints:
  enforceProjectTypeRelationships: true
  tagRelationships:
    frontend:
      requires: ["shared"]
    backend:
      requires: ["shared"]

generator:
  templates:
    - "./templates"

telemetry: true
```
