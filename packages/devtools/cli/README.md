# @dxos/cli

## Run locally (from source)

The `./bin/dx` wrapper runs the CLI directly from TypeScript source via bun, with no build step required. Source-mode resolution is enabled by `--conditions=source` in the wrapper plus a small dev preload (`scripts/dev-preload.ts`) that scopes the `@opentui/solid` babel transform to the CLI's own sources.

```bash
cd packages/devtools/cli
./bin/dx --help
```

Set `DX_DEBUG=debug` (or `verbose`, `info`, `warn`, `error`) for log output:

```bash
DX_DEBUG=debug ./bin/dx chat
```

## Compile standalone binary

To produce a single-file binary for distribution:

```bash
moon run cli:compile
```

The compiled binaries land under `dist/cli-<platform>-<arch>/dx`.

## Admin Commands

Edge admin commands for managing spaces and identities. Requires an admin key and Edge URL,
provided via `--admin-key` / `--edge-url` flags or `DX_HUB_API_KEY` / `DX_EDGE_BASE_URL` env vars.

```bash
dx admin --admin-key <key> --edge-url <url> <subcommand>
```

### `admin space`

| Command  | Description                        | Arguments / Options                                                                           |
| -------- | ---------------------------------- | --------------------------------------------------------------------------------------------- |
| `list`   | List spaces by recent activity.    | `--limit <n>` (default 50), `--cursor <token>`, `--order asc\|desc` (default desc)            |
| `inspect`| Inspect a space.                   | `<spaceId>` (positional)                                                                      |
| `delete` | Delete a space (irreversible).     | `<spaceId>` (positional), `--force` required                                                  |
| `export` | Export space snapshots.            | `<spaceId>` (positional), `--download`, `--output <path>` / `-o <path>`                       |

### `admin identity`

| Command  | Description                        | Arguments x/ Options                                                                           |
| -------- | ---------------------------------- | --------------------------------------------------------------------------------------------- |
| `list`   | List identities.                   | `--limit <n>`, `--cursor <token>`                                                             |
| `inspect`| Inspect an identity.               | `<identityKey>` (positional)                                                                  |
| `delete` | Delete an identity (irreversible). | `<identityKey>` (positional), `--force` required                                              |

All commands support `--json` for machine-readable output.

## CLI Design Guide

- Each command be in its own folder.
- Keep the command definitions file simple and compact with minimal logic and a single export:
  - IDEA(burdon): Single default export for command folder?
  - Inline command options.
  - Inline command handler with preconditions checks then dispatch to testable logic to other files.
- Try to avoid product names (e.g., "composer" in args or commands).
- ISSUE(burdon): camelCase vs hyphenated options?

## Resources

- [Effect CLI](https://github.com/Effect-TS/effect/blob/main/packages/cli/README.md)
- [Effect CLI Docs](https://effect-ts.github.io/effect/docs/cli)
- [Example](https://github.com/Effect-TS/examples/tree/main/templates/cli)
- [OpenTUI](https://github.com/sst/opentui/tree/main/packages/solid)
