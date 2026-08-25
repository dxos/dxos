# Serializable plugin entrypoints

## Goal

A plugin's entrypoint stops being TypeScript. Every plugin ships a `dxplugin.jsonc` next to its
`package.json` carrying the plugin metadata **and** the full module list — each module's id,
activation event, `requires`/`provides` capabilities, and a **relative URL to the module file**.
Nothing about a plugin's shape requires evaluating its code any more.

```jsonc
{
  "key": "org.dxos.plugin.markdown",
  "name": "Markdown",
  "modules": [
    {
      "id": "ReactSurface",
      "src": "./src/capabilities/react-surface.ts",
      "provides": ["org.dxos.app-toolkit.capability.reactSurface"],
      "activatesOn": {
        "oneOf": [{ "id": "org.dxos.app-framework.event.surfacesRequested", "specifier": "org.dxos.role.article" }],
      },
    },
  ],
}
```

## Why

- **The manifest is data.** A host can list a plugin's modules, its activation waves and its
  capability graph without downloading or executing the plugin body — the registry, the plugin
  catalog and devtools all want exactly this.
- **Code-splitting stops being incidental.** Today the split is whatever Rollup infers from
  `() => import('./capabilities/x')` inside a hand-written `plugin.tsx`. With a manifest the build
  is told, per module, that this file is an entrypoint.
- **Third-party plugins get the same shape as bundled ones.** `dxplugin.jsonc` is the same file
  in dev (URLs point at the vite dev server) and in a published bundle (URLs point at built `.js`
  assets), so a host has one loader instead of two.

## Design

### 1. Schema (`@dxos/protocols` → `Config2`)

`Config2.Descriptor` = `Config2.Plugin` fields (key/name/description/icon/…) + `modules`.

- `CapabilityRef` — `"org.dxos.…capability"` (multi, the default arity) or
  `{ "id": "…", "arity": "single" }`.
- `ActivationEventRef` — `"nsid"` | `{ id, specifier? }` | `{ oneOf: […] }` | `{ allOf: […] }`.
- `Module` — `{ id, src, activatesOn?, requires?, provides?, platforms? }`.
  `platforms` (`browser` | `node` | `workerd`) replaces the hand-written `plugin.node.ts` /
  `plugin.workerd.ts` variants: one manifest, filtered at load.

The module `src` file default-exports `(props) => Effect<…>` — exactly what
`Capability.lazyModule`'s loader already expects, so module bodies are unchanged by the migration.

### 2. Runtime (`Plugin.fromManifest`)

```ts
const MarkdownPlugin = Plugin.fromManifest(await import('@dxos/plugin-markdown/dxplugin.jsonc'));
```

`fromManifest` decodes the descriptor, rehydrates each `CapabilityRef` into a capability tag
(`Capability.fromRef` — tags are `Context.Service` keyed by identifier, so a tag rebuilt from
`{identifier, arity}` is the same key the authoring site produced), rehydrates each
`ActivationEventRef`, and builds the `Plugin` with an activate that does
`import(new URL(module.src, baseUrl))`.

Accepts a parsed object, a module namespace (`{ default }`), or raw JSONC text plus a `baseUrl`,
so both the vite path and a runtime `fetch()` of a published manifest go through one function.

### 3. Vite (`dxPluginManifest()`), modelled on vite's HTML handling

- **`resolveId`/`load`** any `*.jsonc` matching a plugin descriptor.
- **dev** — rewrite each `src` to a URL the dev server serves (`/@fs/<abs>`), leaving the module
  graph to vite. No bundling, HMR intact.
- **build** — `this.emitFile({ type: 'chunk' })` per module `src`, then emit the descriptor as an
  asset with each `src` replaced by the built chunk's `fileName` (`.ts` → `.js`).

Emitted as a JS module (`export default {…}`) so the app's `await import()` yields the resolved
descriptor directly; the raw-text + `baseUrl` form stays available for hosts that fetch a
published `dxplugin.jsonc` over HTTP.

### 4. Migration

`dxplugin.jsonc` subsumes `dx.config.ts`'s `plugin` block and the hand-written `plugin.tsx` /
`meta.ts`. Per plugin: author the manifest, delete `meta.ts` / `plugin.*` / `dx.config.ts`, add the
`./dxplugin.jsonc` export to `package.json`, and repoint consumers at
`Plugin.fromManifest(await import('@dxos/plugin-x/dxplugin.jsonc'))`.

## Open questions

1. `meta` is currently imported by name from most plugins (translations keys, graph nodes). It
   has to come from the manifest instead — either a generated `meta` export or a lookup by key.
2. Modules whose maker bakes in a **value** rather than a file (e.g.
   `AppCapability.translations([...])`) need a small module file to point `src` at.
