# Serializable plugin entrypoints — tasks

Design: [DESIGN.md](./DESIGN.md)

## Phase 1 — the mechanism (DONE)

- [x] `Config2.Descriptor` / `Module` / `CapabilityRef` / `ActivationEventRef` / `Platform` schemas
      in `@dxos/protocols`.
- [x] `Capability.fromRef` — rehydrates a tag from `{identifier, arity}` (same context key the
      capability's owner exported, since a tag is `Context.Service(identifier)`).
- [x] `ActivationEvent.fromRef` — rehydrates a single event / `oneOf` / `allOf`.
- [x] `Plugin.fromManifest` + `Plugin.parseDescriptor` + `Plugin.parseJsonc`, accepting a decoded
      descriptor, a module namespace, or raw JSONC text, with `baseUrl` / `platform` options.
- [x] `dxPluginManifest()` vite plugin — dev rewrites `src` to `/@fs/…`; build emits each `src` as
      a chunk and rewrites to `import.meta.ROLLUP_FILE_URL_*`. Wired into composer-app's config.
- [x] `scripts/generate-dxplugin.ts` — generates a descriptor from an existing TS entrypoint
      (activation specs read from the constructed plugin, `src` recovered from the capabilities
      barrel's loaders, positionally matched against the entrypoint's `addModule` order).
- [x] plugin-markdown converted: `dxplugin.jsonc` + `./dxplugin.jsonc` package export +
      `capabilities/translations.ts` (the one module whose body was an inline value) + a fidelity
      test proving the descriptor reconstructs the node and workerd entrypoints exactly.

## Phase 1.5 — authoring (DONE)

- [x] `dxplugin.schema.json` (draft 2020-12) derived from `Config2.Descriptor` via
      `Plugin.descriptorJsonSchema()`, checked in at the app-framework root, exported as
      `@dxos/app-framework/dxplugin.schema.json`, with a drift test.
- [x] `$schema` set on plugin-markdown's descriptor + `**/dxplugin.jsonc` mapped in
      `.vscode/settings.json`.
- [x] `Plugin.getMetaFromDescriptor` — the descriptor's counterpart to `getMetaFromConfig`.
- [x] Ambient `declare module '*/dxplugin.jsonc'` (`packages/sdk/app-framework/dxplugin.d.ts`) —
      present but NOT wired to consumers, and deliberately not an `exports` subpath: a types-only
      subpath broke `composer-app:bundle`, because its import map enumerates and `this.resolve`s
      every export and a types-only target resolves under no runtime condition. A third constraint
      on the Phase 2 distribution route.
- [x] knip: `descriptorEntry()` in `.config/knip.ts` treats a descriptor's `modules[].src` as entry
      points — without it every module body a descriptor names reads as an unused file (this is what
      made CI's `check` job red).

## Phase 2 — retire the TypeScript entrypoints (DONE)

Every blocker below was measured against the real build; the resolutions are recorded in DESIGN.md.

- [x] **Distribute the ambient declaration.** Landed in `@dxos/typings`
      (`packages/common/typings/src/dxplugin.d.ts`, re-exported from its `index.d.ts`), which is
      already in every plugin's tsconfig. app-framework provably cannot host it: a wildcard
      `declare module` loads only from a file in the consumer's own program, and a types-only
      `exports` subpath breaks `composer-app:bundle`, whose import map `this.resolve`s every export
      under runtime conditions.
- [x] **Decide what the published lib does with the descriptor.** `dxplugin.jsonc` is excluded from
      the library build's `external` predicate, so the loader compiles it into
      `dist/lib/chunk-dxplugin.mjs` with each `src` as `new URL("chunk-<module>.mjs",
import.meta.url)` — real emitted assets any runtime can import, no jsonc loader required at
      the host. A host that reads the raw file instead (the bun-compiled CLI) passes
      `baseUrl: new URL('..', import.meta.url)`.
- [x] **Deleted `plugin.tsx` / `plugin.node.ts` / `plugin.workerd.ts`**, plus `dx.config.ts`, the
      `src/platform*.ts` split, the `src/capabilities/{index,node,workerd}.ts` barrels and their
      `#capabilities` subpath, and `export default make`. plugin-markdown now runs entirely off its
      descriptor; `meta.ts` is `Plugin.getMetaFromDescriptor(descriptor)`.
- [x] **Platform is detected, not declared.** `Plugin.currentPlatform()` (workerd → node → browser,
      ordered by how forgeable each signal is — `window` identifies nothing, the node vitest project
      defines it) replaces the per-plugin `#platform` export; `fromManifest` filters
      `modules[].platforms` against it, and `platform: 'all'` disables the filter for tests.
- [x] Four host environments verified: the vite dev server (`/@fs/`), node vitest (file URLs), the
      storybook browser project (loader registered in `createStorybookProject`), and the app bundle
      guard (`check-plugin-set.mjs` counts `dxplugin.jsonc` as a plugin body).

## Phase 3 — migrate the remaining plugins

- [ ] Run the generator over the other ~60 plugins under `packages/plugins`, one commit per batch,
      each with the fidelity test. Expect per-plugin manual work for:
      inline module bodies (`AppCapability.translations([...])`, inline `schema([...])` lists) which
      need a module file, and plugins whose modules are not declared in a `src/capabilities` barrel.
- [ ] Lint rule: a plugin package must have a `dxplugin.jsonc` and export it.
