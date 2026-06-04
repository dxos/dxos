# @dxos/introspect — Design Notes

Phase 1 covers steps 1–3 of the build spec: scaffold + package/symbol indexing + a thin MCP server with four tools.
Phase 2 covers steps 4–5: plugin detection, surfaces, capabilities, and operations (the SPEC's "intents" — see note below).
Phase 3 (this iteration) covers step 6: ECHO-registered schemas — `listSchemas`, `getSchema`, `findSchemaUsage`.
Curation/idioms, composition, UI, and the file watcher remain deferred.

## Plugin / surface / capability / operation extraction

Strategy: plugins are detected by walking each package's canonical files (`src/index.ts`, `src/meta.ts`, `src/*Plugin.{ts,tsx}`, `src/capabilities/**`, `src/operations/**`) for one of these literal call patterns:

- `Plugin.define(` — plugin entry
- `Plugin.Meta` — typed meta export
- `Surface.create(` — surface contribution
- `Capability.contributes(` — capability contribution
- `Operation.make(` — operation definition

When a package has any candidate file, a per-package ts-morph project parses just those files and walks every `CallExpression` for the four target shapes. Surfaces, capabilities, and operations get backfilled with the owning plugin id once `meta.ts` is read.

What we don't do (per spec, "log and skip rather than guess"):

- Evaluate dynamic capability builders
- Follow re-exports across packages
- Resolve template-literal-derived plugin ids beyond the simple string-literal case in `meta.ts`

### Schemas

Detection target: ECHO-registered types only — anything piped through `Type.makeObject({ typename, version })` or `Type.Obj({ typename, version })`. Plain `Schema.Struct` calls without a typename are skipped on purpose: they're internal building blocks, not externally-referenced types, so there's no stable identity to key off.

For each registration we walk back through the parent `.pipe(...)` chain to find the underlying `Schema.Struct({...})` and capture its top-level field names + the variable name (if any). Field type strings are kept verbatim (capped at ~200 chars) so callers see the actual `Schema.optional(Schema.String)` etc. without re-parsing.

`findSchemaUsage` is a textual scan across the same set of candidate files used by the schema extractor. It excludes the _defining_ line (the `Type.makeObject(...)` call) so callers don't get back the same answer as `getSchema`. Cross-package references are picked up only when the consuming file mentions the typename literally — typenames in DXOS are URL-style strings unique enough that false positives are rare.

### "Intents" → "operations"

The current DXOS API uses `Operation.make({ meta: { key, name, description } })` and dispatches via `OperationInvoker`. This is the renamed successor to what the SPEC calls "intents". The introspector exposes this as `listOperations` / `traceOperation` (the latter is still future work — step 8 covers composition queries).

### Performance — lazy by design

Plugin extraction is **not** part of `ready`. It runs on first call to `listPlugins` / `listSurfaces` / `listCapabilities` / `listOperations`, then memoizes per package. For a single-target lookup, `getPlugin(id)` short-circuits via a literal-text scan of every package's `meta.ts` so it doesn't pay the full-monorepo extraction cost.

This is deliberate: the symbols cache (steps 1–3) already adds ~80 s of cold-start parsing. Adding eager plugin extraction on top makes startup unworkable for the typical MCP-session lifecycle.

## Things confirmed by reading the real codebase

- **Plugin shape (for step 4 later):** plugins call `Plugin.define(meta).pipe(...)` from `@dxos/app-framework`, with `meta.id` as the canonical id (e.g. `org.dxos.plugin.markdown`). `meta.ts` files live at `packages/plugins/<name>/src/meta.ts` and export `meta: Plugin.Meta`. Plugin behavior is composed via `AppPlugin.add*Module` calls — `addSurfaceModule`, `addOperationHandlerModule`, `addSchemaModule`, etc. Detection should walk these calls in the plugin's `*Plugin.tsx` entry rather than parsing `meta.ts` alone.
- **Moon project graph:** `moon query projects` returns JSON with `projects[].source` as the path relative to the workspace root. There's no `--json` flag — JSON is the default. Moon walks up to find its workspace root, so `cwd` doesn't constrain it. Package walking gates on `<root>/.moon/` existing to avoid this when running against fixtures.
- **Workspace globs:** `pnpm-workspace.yaml` includes `packages/**/*`, so any package.json under `src/__fixtures__` is picked up by pnpm. Added a `!**/__fixtures__/**` exclusion to keep test fixtures out of the workspace.
- **Catalog deps available:** `ts-morph: ^16.0.0`, `glob: ^7.2.3`, `@modelcontextprotocol/sdk: ^1.27.1`, `vitest: 4.1.5`. No `chokidar` (file watching is step 10).
- **DXOS package shape:** `package.json` uses `exports['.'].source` to point at `src/index.ts`. The entry-point resolver checks `source` first, then `types`, then `main`, falling back to `src/index.ts`.

## Open questions surfaced for later phases

- **Plugin id source:** spec asks whether plugin IDs should be the package name or the `meta.ts` `id` field. Reading the codebase: every plugin sets a unique `id` like `org.dxos.plugin.markdown`. The `id` is the user-visible identifier and is what other plugins reference. Recommend using `meta.id` for `PluginRef`, with the package name carried separately.
- **Plugins outside `packages/plugins/`:** found e.g. `plugin-deck` and many under that path; haven't yet checked for plugins elsewhere. Worth a `find -name meta.ts` sweep when step 4 starts.
- **Existing devtools:** there's a `packages/devtools/devtools` package that may overlap with this work in the future. Not a duplicate today (it's more runtime debugging than static introspection), but a cross-link makes sense once the plugin is built.

## Performance note

First call to `findSymbol` against the real monorepo (~250 packages) takes ~80s because it eagerly extracts symbols from every package. Subsequent calls hit the cache. For v1 this is acceptable; the obvious optimizations are lazy per-package extraction in `findSymbol` (parse only files matching the query), or persisting a cache to `.dxos-introspect/cache/`. Both are out of scope for phase 1.

## Why query methods take a deps object instead of using a class

The query layer (`src/query/`) is pure functions over plain data.
The introspector wires them to a cached extractor closure and a package list. This keeps the query layer trivially testable (pass in fake data, no setup) and makes the eventual file-watcher step a matter of swapping the extractor.
