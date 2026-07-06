# @dxos/dx-trace-imports

Traces static import chains from an entry module to a target package, file, or glob pattern by parsing sources with SWC, resolving `package.json` `imports`/`exports` (including `#`-prefixed import maps), and following transitive dependencies through workspace `@dxos/*` packages.

## Usage

```sh
dx-trace-imports (--from <entry.ts> | --export <subpath>) --to <package-or-pattern-or-path> [options]
```

### Options

- `--from <entry>`: Entry file (relative path or absolute).
- `--export <subpath>`: Package export subpath resolved via `package.json` exports (e.g. `./plugin`). Uses `--conditions` to pick the source file.
- `--to <target>`: Terminal selector. Either:
  - An npm package name (e.g. `protobufjs`, `@dxos/react-ui`).
  - A relative or absolute file path (e.g. `./src/foo.ts`).
  - A glob pattern matched against package names, paths, and external specifiers (e.g. `*.pcss`, `@dxos/react-ui*`).
- `--max-chains <n>`: Stop after this many chains (default: `10`).
- `--conditions <list>`: Comma-separated package.json export conditions (default: `workerd,worker,node`). Pass `""` to clear. Include `source` to trace TypeScript sources instead of compiled output.
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
