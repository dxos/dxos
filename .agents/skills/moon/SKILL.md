---
name: moon
description: Running and configuring moon (the repo's build/task system). Use when running builds/tests/lints via moon run, editing moon.yml or .moon/workspace.yml, debugging task caching or the remote cache, adding tasks for a new package, or using moon query / affected detection.
---

# moon in this repo

moon is the task orchestrator for this monorepo: every build, test, and lint runs
through `moon run <project>:<task>`. The version is pinned in `.prototools`
(currently the v2 line) and installed via proto, so developers invoke moon
through proto's shims — if `moon` is not on PATH:

```bash
export PATH="$HOME/.proto/shims:$HOME/.proto/bin:$PATH"
```

In the Claude Code cloud sandbox moon exists only if `.config/claude-code-setup.sh`
ran — see the `cloud-sandbox` skill before assuming a broken install.

## Everyday commands

```bash
moon run <package>:build                     # build one project
moon exec --on-failure continue --quiet :build   # build everything
moon run <package>:test -- path/to/file.test.ts  # one test file
moon run <package>:test -- --project node src/path/to.test.ts  # one file, node project
MOON_CONCURRENCY=4 moon run :test -- --no-file-parallelism     # full test run
moon run :lint -- --fix                      # lint and fix
moon run storybook-react:serve               # storybook (port 9009)
moon query projects                          # list projects
```

Gotchas learned in this repo:

- `moon run <p>:test -- name` parses the bare arg as a vitest **project filter**
  and fails with "No projects matched the filter node" — pass a file path, or
  `--project node <path>`.
- A package without its own `vitest.config.ts` fails `:test` with an opaque vite
  `_setServer` error.
- Per-package build args (`--entryPoint=...`) live under `tasks.build` in
  `moon.yml`; a stale/missing entryPoint fails the build with esbuild
  "Could not resolve", not a lint error. When you add or delete a barrel, update
  the `--entryPoint` list.
- A dependency that would create a package cycle fails with
  `project_graph::would_cycle`.

## Configuration (this repo's layout)

| File                   | Purpose                                                                     |
| ---------------------- | --------------------------------------------------------------------------- |
| `.moon/workspace.yml`  | Project globs (`packages/**/moon.yml`, `tools/*`, `vendor/*`), remote cache |
| `.moon/toolchains.yml` | Toolchain wiring (versions themselves are pinned in `.prototools`)          |
| `.moon/tasks/*.yml`    | Globally inherited tasks                                                    |
| `moon.yml` (per pkg)   | The package's tasks and tags — read this to see what a package can run      |

### Target syntax

| Pattern        | Description                     |
| -------------- | ------------------------------- |
| `project:task` | Specific project and task       |
| `:task`        | All projects with this task     |
| `#tag:task`    | Projects with tag               |
| `^:task`       | Upstream dependencies (in deps) |
| `~:task`       | Current project (in configs)    |

### Task fields (moon.yml)

| Field     | Description                                                                    |
| --------- | ------------------------------------------------------------------------------ |
| `command` | Command to execute (string or array)                                           |
| `script`  | Shell form (pipes, `&&`)                                                       |
| `args`    | Additional arguments                                                           |
| `deps`    | Task dependencies (e.g. `^:build`)                                             |
| `inputs`  | Files hashed for caching (`@group(sources)`, `/rootFile`, `$ENV_VAR`)          |
| `outputs` | Files to cache                                                                 |
| `options` | `cache`, `runInCI`, `persistent`, `retryCount`, `timeout`, `mutex`, `priority` |

## Remote cache

`.moon/workspace.yml` points at a self-hosted bazel-remote
(`cache.dxos.network`) over mTLS. A remote-cache warning is harmless — builds
work, they just don't share the team cache. To fix it properly, run
`tools/moon-cache/install-certs.sh --op` once per machine (covers every
worktree); details in `tools/moon-cache/README.md`.

## Affected detection and queries

```bash
moon run :test --affected                  # only affected projects
moon ci :test --base origin/main           # compare against base
moon query changed-files
moon query projects "language=typescript && projectType=library"
```

## Reference (generic moon docs)

- **`references/workspace-config.md`** — complete workspace.yml reference
- **`references/task-config.md`** — task configuration and inheritance
- **`references/v2-migration.md`** — v1→v2 changes (this repo is already on v2)
- **`references/cli-reference.md`** — full CLI reference
- **`examples/`** — sample workspace.yml / moon.yml / CI workflow
