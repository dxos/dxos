# @dxos/dx-trace-imports

Traces static import chains from an entry module to a target package, file, or glob pattern by parsing sources with SWC, resolving `package.json` `imports`/`exports` (including `#`-prefixed import maps), and following transitive dependencies through workspace `@dxos/*` packages.

## Usage

```sh
dx-trace-imports (--from <entry.ts> | --export <subpath> | --all-exports | --conditional-exports) (--to <target> | --to-file <file>) [options]
```

### Options

- `--from <entry>`: Entry file (relative path or absolute).
- `--export <subpath>`: Package export subpath resolved via `package.json` exports (e.g. `./plugin`). Uses `--conditions` to pick the source file.
- `--all-exports`: Traces every export subpath in `./package.json`, except `./package.json`, wildcard patterns and stylesheet or data files. A guard that uses it covers subpaths added later without editing the task.
- `--conditional-exports`: Traces each export subpath only under the `--conditions` sets its `package.json` entry names as a key (e.g. `workerd`, `node`). A guard on a runtime build then covers every subpath built for that runtime, and none built only for others.
- `--to <target>`: Terminal selector. Repeatable. Either:
  - An npm package name (e.g. `protobufjs`, `@dxos/react-ui`).
  - A relative or absolute file path (e.g. `./src/foo.ts`).
  - A glob pattern matched against package names, paths, and external specifiers (e.g. `*.pcss`, `@dxos/react-ui*`).
  A bare specifier that matches the selector is a terminal even when it resolves to a file, so a package subpath such as `defuddle/full` can be selected on its own.
- `--to-file <file>`: Reads `--to` targets from a file, one per line; a `!`-prefixed line is an `--allow` entry and `#` starts a comment. Repeatable, and combines with `--to`. Keeps a shared ban list in one place (`.config/server-import-bans.txt`).
- `--allow <specifier>`: A bare specifier (package, subpath or glob) exempt from `--to`. The files it resolves to are traced instead of ending the chain, so `--to "@dxos/react-*" --allow "@dxos/react-ui-*/translations"` passes only while those subpaths import nothing banned. Repeatable.
- `--max-chains <n>`: Stop after this many chains (default: `10`).
- `--conditions <list>`: Comma-separated package.json export conditions (default: `workerd,worker,node`). Include `source` to trace TypeScript sources instead of compiled output. Repeatable — each occurrence is an **independent** set traced separately, so one run can assert the same property under several runtimes (e.g. `--conditions workerd,worker --conditions node`). A subpath that resolves to a different module per runtime is only checked under the runtimes you pass.
- `--packages-only`: Strip filenames, render package-to-package chains, and dedupe.
- `--fail-on <present|missing>`: Exit non-zero when chains are present (`present`) or absent (`missing`). Useful for CI verification.

## Examples

```sh
# Verify the ./plugin export stays UI-free under workerd conditions.
dx-trace-imports \
  --export ./plugin \
  --to "@dxos/react-ui" \
  --conditions source,workerd,worker,node \
  --fail-on present

# Verify it under workerd AND node separately — the export resolves to a different
# barrel per runtime, so a single combined set would leave one of them unchecked.
dx-trace-imports \
  --export ./plugin \
  --to "@dxos/react-ui" \
  --conditions workerd,worker \
  --conditions node \
  --fail-on present

# Verify every EDGE build of a plugin against the shared ban list (the `check-server-imports`
# task every composer plugin inherits from .moon/tasks/tag-composer-plugin.yml).
dx-trace-imports \
  --conditional-exports \
  --to-file ../../../.config/server-import-bans.txt \
  --conditions workerd,worker \
  --fail-on present

# Find import paths from a file to a package.
dx-trace-imports \
  --from packages/plugins/plugin-markdown/src/operations/index.ts \
  --to "@dxos/react-ui" \
  --packages-only

# Glob over react-ui sub-packages.
dx-trace-imports --from src/index.ts --to "@dxos/react-ui*"

# Glob over file extensions.
dx-trace-imports --from src/index.ts --to "*.pcss"
```
