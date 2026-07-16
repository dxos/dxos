# Phase 7 migration brief — per-plugin recipe

Read first: `DESIGN.md` (context), `PHASE7-WORKLIST.md` (your assignment + event
classification), and the reference migrations:
- `packages/plugins/plugin-client/src/ClientPlugin.ts` + `src/capabilities/index.ts` (worked example)
- `packages/plugins/plugin-routine/src/capabilities/{index.ts,layer-specs.ts}` (LayerSpec provider)
- `packages/sdk/app-framework/src/plugin-process-manager/*` (module with requires + finalizers)

## The recipe (per plugin package)

1. **Lazy capability exports** (`src/capabilities/index.ts`, `node.ts`, and any
   `navigation-handler/index.ts`-style nested indexes): `Capability.lazy(name, loader)` →
   `Capability.lazyModule(name, { requires: [...], provides: [...] }, loader)`.
   - `provides`: the capabilities the body contributes (read the body).
   - `requires`: every capability the body reads at activate time via `Capability.get`/
     `Capability.waitFor`/`Capability.atom` (see rules below for which become `yield*`).
   - Stray type args like `Capability.lazy<OperationHandlerSet...>` are misplaced Props —
     drop them.
2. **Bodies** (`src/capabilities/*.ts{,x}`):
   - `yield* Capability.get(X)` → `yield* X` and add X to `requires`.
   - `yield* Capability.atom(MultiCap)` → `(yield* MultiCap).atom` (add to requires) for
     multi-arity capabilities (translations/schema/surfaces/settings/operation-handlers/...).
   - `Capability.contributes(X, impl, deactivate?)` → `Capability.provide(X, impl, deactivate?)`.
     Several entries for one multi capability: keep several `provide` calls or `provideAll`.
   - `contributes(Capabilities.Null, null, () => cleanup)` → `yield* Effect.addFinalizer(() =>
     cleanup)` + return `[]` (declare `provides: []`).
   - Bodies may conditionally return `[]`/skip a declared provide (runtime warns, not fails).
3. **Plugin entry files** (`<Name>Plugin.{ts,tsx}` + `.node.ts` + `.workerd.ts` — keep
   variants' specs in sync):
   - Void-props lazy modules: `Plugin.addModule({ activatesOn/fires... , activate: X })` →
     `Plugin.addLazyModule(X)`; add `{ activatesOn: E }` only for genuine runtime events,
     `{ compatFires: [E] }` to keep firing a legacy ordering event for unmigrated listeners.
   - Props-taking modules keep the callback form:
     `Plugin.addModule((options) => ({ id: Capability.getModuleTag(X), requires: X.requires,
     provides: X.provides, activate: () => X(props) }))`.
   - AppPlugin helpers: pass `requires: X.requires, provides: X.provides` to opt into
     dependency mode (body-only calls stay legacy — that is NOT migrated). Value-bearing
     helpers (addTranslationsModule/addSchemaModule/addPluginAssetModule/addCommandModule)
     are already dependency-mode — leave their calls as-is.
   - `activatesOn` mapping: `Startup`/`Setup*`/`*Ready`/`allOf(...)` of ordering events →
     dependency mode with `requires` on the capability behind each Ready event
     (AttentionReady→AttentionCapabilities.Attention, AppGraphReady→AppCapabilities.AppGraph,
     LayoutReady→AppCapabilities.Layout, ProgressRegistryReady→AppCapabilities.ProgressRegistry,
     ProcessManagerReady→Capabilities.OperationInvoker or ProcessManagerRuntime as the body needs,
     ClientReady→ClientCapabilities.Client, StateReady/SettingsReady→that plugin's State/Settings
     capability). Mixed `allOf(<runtime event>, <ordering events>)` → `activatesOn: <runtime
     event>` + `requires: [...]`. Genuine runtime events (see work-list classification) stay
     `activatesOn`.
   - Modules that other (unmigrated) plugins listen to via `firesAfterActivation: [E]` →
     `compatFires: [E]`.
   - Custom ordering-only events: mark `@deprecated` in the types file, keep exported.
4. **Settings-module bodies contributing a plugin-local Settings capability**: pass explicit
   `provides: [AppCapabilities.Settings, XCapabilities.Settings]` to the helper.
5. **CreateObject modules**: pass `provides: [SpaceCapabilities.CreateObjectEntry]` explicitly
   (helper has no default).

## Hard rules (violations broke the app during Phase 5 — do not skip)

- **Graph-extension bodies (`connector:`/`resolver:`/actions closures inside
  `GraphBuilder.createExtension`) must NEVER call sync `Capability.get`.** Hoist an atom
  before `createExtension`: `const xAtom = yield* Capability.atom(X);` then inside the
  callback `const [x] = get(xAtom); if (!x) return [] /* or null for resolver */;`.
  This establishes a reactive dependency so the node heals when the capability lands.
  `Capability.get` inside ACTION `data:` closures (invoked on user action) is fine.
- **TS2883**: if the build errors "cannot be named without a reference to ...node_modules...",
  add an explicit `import type { X } from '@dxos/<pkg>'` with the standard two-line comment
  (see plugin-client/src/capabilities/index.ts). Add missing workspace deps with
  `pnpm add --filter @dxos/<plugin> "@dxos/<pkg>@workspace:*"`.
- **No casts** (`as any`, non-null `!`) — repo rule. No compatibility re-exports.
- LayerSpec/TraceSink provider modules: dependency-mode `provides: [Capabilities.LayerSpec,
  Capabilities.TraceSink]`-style (see plugin-routine reference). Their specs already declare
  their own effect-level requires — the MODULE usually needs `requires: []`.

## Gates (run per plugin; fix everything you break)

- `moon run <package>:build` then `moon run <package>:test` (from repo root).
- After the whole batch: `moon run app-framework:test plugin-client:test` must stay green.
- Do not commit; leave changes in the working tree for review.
