# Phase 9 sweep — migrate all plugins off AppPlugin to capability module makers

You migrate an assigned list of packages in worktree `/Users/jdw/.t3/worktrees/dxos/t3code-84a5cc44`
(branch `t3code/84a5cc44`). Hard rules: never create branches/worktrees; never commit or
push; no casts (`as any`, `as unknown as T`, non-null `!`); TypeScript single quotes, arrow
functions. Reference examples of the finished pattern: `plugin-markdown` and `plugin-client`
(`src/capabilities/index.ts` + plugin entry) — mimic them exactly.

## Target shape

- The plugin entry (`XPlugin.ts(x)`, plus `.node.ts` / `.workerd.ts` variants) is a chain of
  bare `Plugin.addLazyModule(Module)` calls (plus `Plugin.define` / `Plugin.make`). No
  `AppPlugin.*`, no explicit type arguments, no `requires:`/`provides:` restating, no
  `activatesOn`/props at this level.
- Modules are authored in the capabilities barrel (usually `src/capabilities/index.ts`) via:
  - a **maker** when the module provides a capability from the mapping table below
    (`AppCapability.surface(() => import('./react-surface'))`), with optional
    `{ requires: [...], provides: [<extra tags>], activatesOn: <event>, props: (options) => props }`;
  - `Capability.lazyModule(name, { requires?, provides, activatesOn?, props? }, loader)` for
    plugin-local capability sets;
  - `Capability.inlineModule(name, spec, body)` for small eager bodies.
- Value-style contributions are created inline in the plugin entry:
  `Plugin.addLazyModule(AppCapability.translations(translations))`, same for
  `AppCapability.schema([...])`, `AppCapability.pluginAsset(...)`, `AppCapability.commands([...])`.

## Maker mapping table

| provides tag                               | maker                                                                                   |
| ------------------------------------------ | --------------------------------------------------------------------------------------- |
| `Capabilities.ReactSurface`                | `AppCapability.surface`                                                                 |
| `Capabilities.OperationHandler`            | `AppCapability.operationHandler`                                                        |
| `Capabilities.ReactContext`                | `AppCapability.reactContext`                                                            |
| `Capabilities.ReactRoot`                   | `AppCapability.reactRoot`                                                               |
| `Capabilities.UndoMapping`                 | `AppCapability.undoMappings`                                                            |
| `AppCapabilities.AppGraphBuilder`          | `AppCapability.appGraphBuilder`                                                         |
| `AppCapabilities.Settings`                 | `AppCapability.settings`                                                                |
| `AppCapabilities.SkillDefinition`          | `AppCapability.skillDefinition`                                                         |
| `AppCapabilities.NavigationTargetResolver` | `AppCapability.navigationResolver`                                                      |
| `AppCapabilities.NavigationHandler`        | `AppCapability.navigationHandler`                                                       |
| `AppCapabilities.CommentConfig`            | `AppCapability.commentConfig`                                                           |
| `AppCapabilities.TextContent`              | `AppCapability.textContent`                                                             |
| `AppCapabilities.AnchorSort`               | `AppCapability.anchorSort`                                                              |
| `AppCapabilities.Translations` (value)     | `AppCapability.translations`                                                            |
| `AppCapabilities.Schema` (value)           | `AppCapability.schema`                                                                  |
| `AppCapabilities.PluginAsset` (value)      | `AppCapability.pluginAsset`                                                             |
| `Capabilities.Command` (value)             | `AppCapability.commands`                                                                |
| `SpaceCapabilities.CreateObjectEntry`      | `SpaceCapability.createObject` (import `{ SpaceCapability }` from `@dxos/plugin-space`) |

`AppCapability` comes from `@dxos/app-toolkit`. When a module provides the maker capability
PLUS extra tags, pass the extras via the maker's `provides` option. When its default module
name matters to a failing test, pass `name:` to preserve the old id; otherwise accept the
maker default.

## Mechanical transforms

1. `AppPlugin.addXModule<...>({ requires: M.requires, provides: M.provides, activate: M })`
   → `Plugin.addLazyModule(M)`, and convert `M`'s definition to a maker per the table
   (drop the now-redundant provides; keep custom requires/extras).
2. `AppPlugin.addXModule({ activate: <inline effect body> })` (no lazy import) → author the
   body with `Capability.inlineModule` in the barrel (provides = the helper's capability),
   chain with bare `Plugin.addLazyModule`.
3. `AppPlugin.addTranslationsModule({ translations })` →
   `Plugin.addLazyModule(AppCapability.translations(translations))`; same pattern for
   schema/pluginAsset/commands.
4. `Plugin.addModule({ id: Capability.getModuleTag(M), requires: M.requires, provides: M.provides, activate: M })`
   → `Plugin.addLazyModule(M)`.
5. Options-function forms — `AppPlugin.addXModule((options: T) => ({ ... activate: () => M(map(options)) }))`
   or `Plugin.addModule((options: T) => ...)` — move the mapping into `M`'s spec as
   `props: (options: T) => <props>` (import the options type in the barrel), then bare
   `Plugin.addLazyModule(M)`.
6. `Plugin.addLazyModule(M, { activatesOn: E })` → move `activatesOn: E` into `M`'s spec.
7. DELETE every TS2883 workaround block — the comment
   `// Explicit imports so the emitted '.d.ts' references the packages via their public aliases ... (TS2883)`
   plus its `eslint-disable-next-line unused-imports/no-unused-imports` type imports. The
   opaque `Capability.Module<Options>` type makes them dead. If declaration emit still
   fails after conversion, something was not converted — fix that instead of re-adding.
8. Remove now-unused imports (`AppPlugin`, `Capability` where only used for the old
   boilerplate, `getModuleTag`). Keep `Capability` where `lazyModule`/`inlineModule` remain.
9. Stories/tests inside the package that use `AppPlugin.*` get the same treatment (fixtures
   often use `AppPlugin.addSurfaceModule` — convert to `Plugin.addLazyModule(AppCapability.surface(...))`
   or `Capability.inlineModule` as appropriate).

## What NOT to do

- Do not touch `packages/sdk/app-toolkit/src/app-framework/AppPlugin.ts` (a dedicated final
  pass deletes it once zero call sites remain).
- Do not rename capability tags or change requires/provides semantics — this is a purely
  mechanical API migration; activation behavior must be identical.
- Do not leave compatibility shims or re-exports.
- Do not add explicit type annotations unless the compiler forces one; if it does, flag it
  in your report.

## Gates (per package, before moving to the next)

`moon run <package>:build <package>:test` — both green. After the whole list:
`moon run <p1>:lint <p2>:lint ... -- --fix` for your packages, then report.

Report: per package — files changed, transforms applied beyond the mechanical set, gate
results. Flag anything ambiguous instead of guessing.
