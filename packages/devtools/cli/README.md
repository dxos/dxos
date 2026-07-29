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

## Where commands live

`src/commands/*` holds only the CLI's own topics (`admin`, `chat`, `debug`, `function`, `hub`,
`mailbox`, `mcp`, `reflect`, `reset`). Everything else is contributed by the Composer plugins listed
in `src/commands/plugin-defs.ts` and lives in the plugin package — e.g. `dx registry publish` is
`packages/plugins/plugin-registry/src/commands/registry/`. Run `dx --help` for the merged topic list.

## Release

```bash
moon run cli:bundle          # Compile per-platform binaries into dist/.
moon run cli:smoke           # Pack, install, and run the host-platform tarball.
moon run cli:smoke-isolated  # Run it with the workspace's node_modules hidden (currently fails).
moon run cli:publish         # Publish the platform packages, then the launcher.
```

`smoke` and CI both build and run the binary in the same place, so anything the bundle resolved at build
time still resolves there. `smoke-isolated` hides the workspace's `node_modules` to show what every other
machine sees, and it is the only thing that catches a binary reaching back into the tree that built it —
two shipped defects were observable nowhere else:

- `@automerge/automerge`'s node entry reads its WASM from a `__dirname`-derived path, which Bun resolves
  at bundle time.
- `classic-level` binds a native addon that a single-file binary cannot carry. It loaded during startup
  only because `@dxos/kv-store`'s main entry exported `createLevel` alongside its types, so importing the
  package for a type pulled the addon in. The value now lives behind `@dxos/kv-store/level`.

Other addons (`sharp`, `koffi`, `node-datachannel`) are still in the graph but are not reached during
startup. Any command that does reach one will fail off the build machine, so extend `COMMANDS` in
`scripts/smoke-isolated.ts` as coverage grows.

`bundle` produces `dist/cli` (the `@dxos/cli` launcher, published from `bin/dx.js`) plus one
`dist/cli-<platform>-<arch>/dx` binary per target, each published as its own package and wired into
the launcher's `optionalDependencies`.

These constraints are easy to break and only observable in the published artifact, which is what
`smoke` exists to catch:

- The binary must carry mode 755 all the way into the tarball — the launcher `execFileSync`s it by
  path, so npm never applies the executable bit for us. `pnpm publish` normalizes file modes to
  0644, hence `scripts/publish.ts` uses `npm publish`.
- Nothing may be marked `external` in the compiled build unless it is also reachable at runtime.
  Externals become plain requires inside Bun's embedded filesystem (`/$bunfs`), where no
  `node_modules` exists, so an external that any command touches fails at startup. Assets are
  inlined instead — see the `?url`, `node-std`, and `subduction-wasm` plugins in `scripts/build.ts`.
- A package that reads its own files at runtime (rather than importing them) needs a bundler-friendly
  entry point; the paths it computes from `import.meta.url` land inside `/$bunfs`, where its siblings
  do not exist.
- The pinned bun version is part of the artifact's correctness, so `.prototools` is a `bundle` input.
  1.3.4 leaked `--smol` into `process.argv` of every compiled binary, which made `dx` reject its own
  arguments.

## Preview builds

Every push to `main` publishes the generated packages to [pkg.pr.new](https://pkg.pr.new), so a fix is
installable without waiting for an npm release. Install the package for your own platform:

```bash
npm i https://pkg.pr.new/@dxos/cli-linux-x64@<commit-sha>
npx dx --version
```

Install the platform package rather than the `@dxos/cli` launcher: npm must download a URL
dependency's tarball to read its `os`/`cpu` fields, so it cannot skip the platforms it will discard,
and a launcher install fetches all five (~330 MB). Each platform package declares its own `dx` bin for
this reason. Installing from npm is unaffected — the launcher's `dx` takes precedence when both are
present, and registry dependencies are platform-filtered without downloading.

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
