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

## Serve as an MCP server

`dx mcp serve` exposes your spaces to an MCP client over stdio — the local twin of the
deployed server at `mcp.dxos.org`. Both are hosts over the same `@dxos/mcp-server` package, so the
tools, prompts and `loadSkill` output are identical; what differs is host-layer only (no OAuth here,
and operations run in-process). A skill projects as a prompt and the operations it names are rows
`queryOperations` returns, so a plugin you enable shows up without touching this command.

Two things follow from stdio and are worth knowing before you debug it:

- **stdout is the protocol.** Logs go to stderr, so `DX_DEBUG=debug` is safe to leave on; anything a
  command prints to stdout is not.
- **The server is unauthenticated and runs as you.** It reads and writes every visible space in the
  profile it starts with (HALO and settings spaces excluded). Point a client at it only if you would
  give that client your identity.

The setup below assumes `dx` is installed globally and on your `PATH`:

```bash
npm i -g @dxos/cli
dx mcp serve   # sits waiting for a client, which is correct — Ctrl-C out
```

### Claude Code

```bash
claude mcp add dxos --scope user -- dx mcp serve
claude mcp list   # dxos: dx mcp serve - ✓ Connected
```

`--scope user` makes it available in every project; drop it for the current project only, or use
`--scope project` to write a checked-in `.mcp.json` for the whole team. Remove with
`claude mcp remove dxos`.

### Claude Desktop

Settings → Developer → Edit Config, or edit the file directly
(`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS,
`%APPDATA%\Claude\claude_desktop_config.json` on Windows):

```json
{
  "mcpServers": {
    "dxos": {
      "command": "/absolute/path/to/dx",
      "args": ["mcp", "serve"]
    }
  }
}
```

Restart Claude Desktop; the tools appear under the connector menu and skills as slash commands.

`command` must be **absolute** — `which dx` (`where.exe dx` on Windows) gives the path. A GUI app is not launched from your
shell, so it does not inherit your `PATH` and a bare `dx` will not resolve.

### Other clients

Anything speaking MCP over stdio works — the command is `dx mcp serve` with no arguments.
`src/commands/mcp/serve.test.ts` drives a raw session over a pipe if you want the wire shape.

### Choosing a profile

`dx mcp serve` serves whichever profile it starts with, so a client wired to it sees that profile's
identity and spaces. Set `DX_PROFILE` if the default is not the one you want:

```bash
claude mcp add dxos --scope user --env DX_PROFILE=main -- dx mcp serve
```

```json
{ "mcpServers": { "dxos": { "command": "…", "args": ["mcp", "serve"], "env": { "DX_PROFILE": "main" } } } }
```

Set it in the client's `env` rather than exporting it: neither client is launched from your shell, so
an exported variable does not reach the server.

### Running from source

`bin/dx` runs the CLI from source with no build step, so a rebuilt tree is picked up on the client's
next connection. Substitute its absolute path for `dx` everywhere above — the wrapper resolves the
repo relative to itself, so it works from any directory:

```bash
claude mcp add dxos-dev -- /path/to/dxos/packages/devtools/cli/bin/dx mcp serve
```

Register it under a distinct name if you also have the released `dx` configured; two servers offering
the same tool names leave the client to disambiguate.

Add `--watch` to pick up an edit without restarting the client:

```bash
claude mcp add dxos-dev -- /path/to/dxos/packages/devtools/cli/bin/dx mcp serve --watch
```

The server runs as a child of a supervisor that holds the client's stdio. When the child reloads,
the supervisor replays the MCP handshake into the new one and emits `tools/list_changed` and
`prompts/list_changed`, so the client never reconnects and never re-initializes. In-flight requests
are answered with an error rather than left hanging, so retry them. Each reload is a full server
start — identity, storage and plugin activation — so expect the first request after an edit to wait
on that.

What counts as a change depends on which `dx` you are running, because what can change differs:

|                | watched                                                | how                                                                         |
| -------------- | ------------------------------------------------------ | --------------------------------------------------------------------------- |
| from source    | every source file the server imported                  | `bun --watch`, which reloads in place — same pid, same pipes, wiped JS realm |
| released binary| the directories of your `--dev`-installed plugins       | the supervisor re-runs the binary and watches those directories itself       |

### From source

**`--watch` runs the child with `--conditions=source`**, unlike a plain `bin/dx`. Without it every
`@dxos/*` import resolves to that package's `dist`, so editing a plugin's source would change
nothing the watcher tracks until you rebuilt it — the reload would fire on builds rather than on
edits. Set `DX_SOURCE=0` to opt back out and get the rebuild-triggered loop instead.

Only files the server actually imported are watched, and **the CLI imports subpaths rather than
barrels** (`@dxos/plugin-projects/operations`, not `@dxos/plugin-projects`). Editing a package's
`src/index.ts` therefore reloads nothing if nothing imports it; edit the module that is really on
the path.

### From the released binary

A shipped `dx` has no sources, and bun's watcher is not in the artifact — a compiled binary treats a
`--watch` token as ordinary program argv, not as bun's own flag. So the supervisor re-runs the binary itself and
watches the only on-disk code a shipped `dx` can see change: the plugins you installed with
`dx plugin add --dev <path>`, which are read in place rather than copied.

```bash
dx plugin add --dev ~/src/my-plugin     # a link, not a copy
claude mcp add dxos -- dx mcp serve --watch
```

Edit anything under `~/src/my-plugin` and the server restarts with your change, keeping the client's
session. The directories come from the running server rather than from config the supervisor reads
itself, so adding or removing a dev plugin re-arms the watch on the next reload. `copy` installs
(`dx plugin add <url>`) are deliberately not watched: they are snapshots the CLI owns, and only
`add` rewrites them.

`globalThis.DX_CLI_BUNDLED`, substituted by the `define` in `scripts/build.ts`, is what picks the
strategy. It is substituted while bundling rather than read at startup, so nothing in the
environment can flip it.

## Release

```bash
moon run cli:bundle   # Compile per-platform binaries into dist/.
moon run cli:smoke    # Pack, install, and run the tarballs with node_modules hidden.
moon run cli:publish  # Publish the platform packages, then the launcher.
```

`smoke` gates `publish` and covers two independent axes. Packing and installing catches tarball problems
— file modes, the `files` array, the launcher's platform mapping and its `require.resolve`. Running the
result with the workspace's `node_modules` bind-mounted away catches a binary reaching back into the tree
that built it, which nothing else can: a path resolved at bundle time still resolves wherever the binary
was built, so both this test and CI would otherwise pass. Two shipped defects were visible only there:

- `@automerge/automerge`'s node entry reads its WASM from a `__dirname`-derived path, which Bun resolves
  at bundle time.
- `classic-level` binds a native addon that a single-file binary cannot carry. It loaded during startup
  only because `@dxos/kv-store`'s main entry exported `createLevel` alongside its types, so importing the
  package for a type pulled the addon in. The value now lives behind `@dxos/kv-store/level`.

Other addons (`sharp`, `koffi`, `node-datachannel`) are still in the graph but are not reached during
startup. Any command that does reach one will fail off the build machine, so extend `COMMANDS` in
`scripts/smoke.ts` as coverage grows.

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
