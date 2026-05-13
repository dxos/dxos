# @dxos/dx-trace-imports

Traces static import chains from an entry module to a target package, file, or glob pattern using an esbuild metafile.

## Usage

```sh
dx-trace-imports --from <entry.ts> --to <package-or-pattern-or-path> [options]
```

### Options

- `--from <entry>`: Entry file (relative path or absolute) used as the only esbuild entry point.
- `--to <target>`: Terminal selector. Either:
  - An npm package name (e.g. `protobufjs`, `@dxos/react-ui`).
  - A relative or absolute file path (e.g. `./src/foo.ts`).
  - A glob pattern matched against package names, paths, and external specifiers (e.g. `*.pcss`, `@dxos/react-ui*`).
- `--max-chains <n>`: Stop after this many chains (default: `10`).
- `--conditions <list>`: Comma-separated esbuild custom conditions (default: `workerd,worker,node`). Pass `""` to clear.
- `--packages-only`: Strip filenames, render package-to-package chains, and dedupe.
- `--fail-on <present|missing>`: Exit non-zero when chains are present (`present`) or absent (`missing`). Useful for CI verification.

## Examples

```sh
# Find import paths from the operations entrypoint to a package.
dx-trace-imports \
  --from packages/plugins/plugin-markdown/src/operations/index.ts \
  --to "@dxos/react-ui" \
  --packages-only

# Glob over react-ui sub-packages.
dx-trace-imports --from src/index.ts --to "@dxos/react-ui*"

# Glob over file extensions.
dx-trace-imports --from src/index.ts --to "*.pcss"

# Verification mode — exits 1 if any chain reaches the target.
dx-trace-imports \
  --from src/operations/index.ts \
  --to "@dxos/react-ui" \
  --fail-on present
```
