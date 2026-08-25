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

## Phase 2 — retire the TypeScript entrypoints

The descriptor is the source of truth but the old entrypoints are still what the app imports.
Two things block deleting them, both about `.jsonc` outside vite:

- [ ] **`meta.ts`.** 18 files in plugin-markdown alone import `meta` from `#meta`, statically.
      Sourcing it from the descriptor means importing `../dxplugin.jsonc` from TypeScript, which
      needs (a) an ambient `declare module '*/dxplugin.jsonc'` typed as `Config2.Descriptor`, and
      (b) the loader in the package's own `ts-build`/rolldown library build, not just the app's.
      Decide between that and a generated `meta.ts`.
- [ ] **`plugin.tsx` / `plugin.node.ts` / `plugin.workerd.ts`.** Once `meta` is settled these are
      pure duplication — `platforms` already expresses the split, and the markdown fidelity test
      asserts the descriptor reproduces both server variants.
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
