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

### 5. Authoring: JSON Schema

The descriptor is hand-authored, so the schema is what makes it writable. `dxplugin.schema.json`
(draft 2020-12) is derived from `Config2.Descriptor` by `Plugin.descriptorJsonSchema()`, checked in
at the app-framework package root, and drift-tested against the runtime schema. Each descriptor sets
`$schema` to a workspace-relative path into `node_modules/@dxos/app-framework/` — it resolves
offline, in every editor, and always to the schema the installed SDK validates against, which a
hosted URL would not. `.vscode/settings.json` also maps `**/dxplugin.jsonc` to it for editors that
ignore `$schema`.

## What blocked deleting the TypeScript entrypoints (all resolved)

Measured, not assumed — each of these was reproduced against the real build. They are kept here
because the measurements, not the conclusions, are what justify the shapes that landed.

### `meta.ts`

21 uses across plugin-markdown, of which **18 are `meta.profile.key`** — the plugin's NSID string,
nothing more. The type does not narrow: `Plugin.Meta.profile.key` is `Schema.String`, so it is
already `string` and never a literal. So the NSID-literal branding on `Capability.makeSingleton<T>()`
(`` `${meta.profile.key}.capability.settings` ``) is unaffected by where `meta` comes from — that is
NOT a blocker, as first suspected.

What is left is two mechanical facts:

1. **TypeScript applies an ambient wildcard `declare module` only to NON-relative specifiers.**
   `import descriptor from '../dxplugin.jsonc'` cannot be typed by any ambient declaration —
   reproduced as `TS2307: Cannot find module '../dxplugin.jsonc'`. A plugin must import its own
   descriptor by package specifier (`@dxos/plugin-markdown/dxplugin.jsonc`), which the wildcard does
   match. Confirmed working.
2. **The declaration has to be in the consumer's program.** `dxplugin.d.ts` shipped from
   app-framework and named in the consumer's tsconfig `types` did NOT load (still TS2307); the same
   declaration placed in the plugin's own `src/` did. So the central declaration needs a working
   distribution route — a `types` entry that actually resolves, or `@dxos/typings` (already in every
   plugin's tsconfig `types`, but layered below protocols).

**Resolved** via `@dxos/typings`: `packages/common/typings/src/dxplugin.d.ts`, re-exported from its
`index.d.ts`. The layering objection does not bite — the declaration only names
`import('@dxos/protocols').Config2.Descriptor` as a type, which costs no runtime edge.

### `plugin.tsx` / `plugin.node.ts` / `plugin.workerd.ts`

One real blocker, and it is a **runtime** one, not a type one. With `meta.ts` importing the
descriptor, `plugin-markdown:build` goes green — but rolldown **externalizes** the specifier, so
`dist/lib/meta.mjs` ships:

```js
import descriptor from '@dxos/plugin-markdown/dxplugin.jsonc';
```

That resolves wherever the vite loader runs (the app) and fails wherever it does not (plain node —
the edge operation-service and agent runtime, which is exactly what `plugin.node.ts` /
`plugin.workerd.ts` exist to serve). So the decision is whether a plugin's published lib may carry a
`.jsonc` import — which obliges every non-vite host to install a loader — or whether the descriptor
is inlined at build time for the lib output.

Everything else about deleting them is settled: `platforms` already expresses the browser/node/workerd
split, and the fidelity test asserts the descriptor reproduces both server variants exactly.

**Resolved by inlining**, the second option: `dxplugin.jsonc` is excluded from the library build's
`external` predicate, so the loader runs on the lib path too and compiles the descriptor into
`dist/lib/chunk-dxplugin.mjs`, each `src` a `new URL("chunk-<module>.mjs", import.meta.url)` over a
chunk the same build emitted. No host needs a jsonc loader. A host that deliberately reads the raw
file — the bun-compiled CLI, which bundles no vite — passes `baseUrl` to `fromManifest` instead.

The `platforms` array then became redundant as _authored_ data too: `Plugin.currentPlatform()`
detects the host (workerd → `process.versions.node` → browser, ordered by how forgeable each signal
is; `window` identifies nothing, since the node vitest project defines it), so a plugin declares
which platforms a module supports and never which platform it is running on.

### Remaining smaller item

Modules whose maker bakes in a **value** rather than a file (`AppCapability.translations([...])`,
inline `schema([...])` lists) need a module file to point `src` at. Done for markdown
(`capabilities/translations.ts`), and a lazily-loaded chunk is the better shape anyway.
