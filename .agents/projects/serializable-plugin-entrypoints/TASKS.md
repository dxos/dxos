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
- [x] Ambient `declare module '*/dxplugin.jsonc'` (`packages/sdk/app-framework/dxplugin.d.ts`).
- [x] knip: `descriptorEntry()` in `.config/knip.ts` treats a descriptor's `modules[].src` as entry
      points — without it every module body a descriptor names reads as an unused file (this is what
      made CI's `check` job red).

## Phase 2 — retire the TypeScript entrypoints

Blockers measured against the real build (details + repro in DESIGN.md):

- [ ] **Distribute the ambient declaration.** Proven: TS applies a wildcard `declare module` only to
      NON-relative specifiers, so a plugin must import its own descriptor as
      `@dxos/plugin-x/dxplugin.jsonc` (works); and the declaration must be in the consumer's
      program — shipping it from app-framework and naming it in the consumer's tsconfig `types` did
      NOT load it, while the same file in the plugin's own `src/` did. Pick the distribution route
      (a resolving `types` entry, or `@dxos/typings`, which is already in every plugin's tsconfig).
- [ ] **Decide what the published lib does with the descriptor.** With `meta.ts` importing it, the
      build is green but rolldown externalizes the specifier — `dist/lib/meta.mjs` ships
      `import descriptor from '@dxos/plugin-markdown/dxplugin.jsonc'`, which resolves under vite and
      fails under plain node (the edge/agent hosts `plugin.node.ts` exists for). Either every
      non-vite host installs a jsonc loader, or the lib build inlines the descriptor.
- [ ] **Then delete `plugin.tsx` / `plugin.node.ts` / `plugin.workerd.ts`.** Nothing else blocks it:
      `platforms` expresses the split and the fidelity test proves both server variants reproduce.
- [ ] Repoint `composer-app` (and the plugin-registry catalog) at
      `Plugin.fromManifest(await import('@dxos/plugin-x/dxplugin.jsonc'))`.
- [ ] Fold `dx.config.ts` into the descriptor — `Config2.Descriptor` is a superset of
      `Config2.Config`'s `plugin` block, so `loadDxConfig` and `composerPlugin`'s manifest emit
      should read the descriptor instead.

## Phase 3 — migrate the remaining plugins

- [ ] Run the generator over the other ~60 plugins under `packages/plugins`, one commit per batch,
      each with the fidelity test. Expect per-plugin manual work for:
      inline module bodies (`AppCapability.translations([...])`, inline `schema([...])` lists) which
      need a module file, and plugins whose modules are not declared in a `src/capabilities` barrel.
- [ ] Lint rule: a plugin package must have a `dxplugin.jsonc` and export it.
