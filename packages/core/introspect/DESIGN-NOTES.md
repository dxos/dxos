# @dxos/introspect — Design Notes

Phase 1 covers steps 1–3 of the build spec: scaffold + package/symbol indexing + a thin MCP server with four tools. Plugin/surface/capability/intent/schema/idiom layers are deferred.

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

The query layer (`src/query/`) is pure functions over plain data. The introspector wires them to a cached extractor closure and a package list. This keeps the query layer trivially testable (pass in fake data, no setup) and makes the eventual file-watcher step a matter of swapping the extractor.
