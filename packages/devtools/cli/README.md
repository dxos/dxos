# @dxos/cli

## Run locally

To run the CLI locally first compile it:

```bash
moon run cli:compile
```

Once it's compiled it can be run from the cli package:

```bash
./dist/<platform>/dx
```

## Development

```bash
moon run cli:dev -- --help
```

Running with vite-node (reads all workspace packages directly from source, so rebuilds are not required):

```bash
cd packages/devtools/cli
./dxnext
```

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
