---
name: composer-plugins
description: Use when working on files in packages/plugins/, adding new plugins,
  refactoring plugin components/containers, writing storybooks for plugins,
  or wiring capabilities like react-surface or operation-resolver.
---

# Composer Plugins

Exemplar: `packages/plugins/plugin-chess`. Read its source files to understand every pattern below.

## Discovery

Use the `dxos-introspect` MCP server (`@dxos/introspect-mcp`, served by the `dx-introspect-mcp` binary) as the source of truth for plugin metadata and reference examples — not directory listings.
A "plugin" is a package whose `src/meta.ts` exports a `Plugin.Meta`, so `ls packages/plugins/` overcounts (e.g. `plugin-generator` is tooling, not a plugin).

- `mcp__dxos-introspect__list_plugins` — enumerate plugins (filter by `id` substring; pass `compact: true` for identifying fields only).
- `mcp__dxos-introspect__get_package` — package details for a given plugin.
- `mcp__dxos-introspect__list_surfaces` / `list_capabilities` / `list_operations` / `list_schemas` — drill into a plugin's contributions.
- `mcp__dxos-introspect__find_symbol` / `get_symbol` / `list_symbols` — locate code by symbol rather than grepping paths.
- `mcp__dxos-introspect__list_idioms` — enumerate `@idiom`-tagged reference examples (filter by `slug` substring or `hostKind: 'symbol' | 'story' | 'test'`).

Reach for these first when answering questions like "how many plugins", "which plugin contributes X surface", or "where is symbol Y defined".

### Search idioms before implementing

**Required.** Before writing or refactoring any container, capability, operation, blueprint, or schema, call `mcp__dxos-introspect__list_idioms` and scan for a slug that matches what you're about to build. An idiom is a JSDoc-tagged pinning of the canonical way to do one thing — when one exists, it is the answer, and you should `get_symbol` on the host artifact and follow the pattern rather than reinventing it.

Typical triggers:

- Building a toolbar → look for `org.dxos.react-ui-menu.*` idioms.
- Wiring `useObject` / mutating ECHO subjects → look for ECHO idioms.
- Writing a surface filter, operation handler, blueprint, or container scaffold → search by the feature word first.

If no idiom matches, proceed using the exemplar (`plugin-chess`); if you find yourself writing something that other plugins will copy, consider adding a new `@idiom` tag (see [`packages/reflect/deus/docs/IDIOMS.md`](../../../packages/reflect/deus/docs/IDIOMS.md) for the format and slug rules).

## Specification

Each plugin MUST have a `PLUGIN.mdl` specification written in the **MDL** (`.mdl`) language defined by `@dxos/deus`. The authoritative references live under [`packages/reflect/deus/`](../../../packages/reflect/deus/):

- [`docs/DESIGN.md`](../../../packages/reflect/deus/docs/DESIGN.md) — language specification.
- [`docs/IDIOMS.md`](../../../packages/reflect/deus/docs/IDIOMS.md) — idiom format and `@idiom` JSDoc-tag conventions.
- [`lang/core.mdl`](../../../packages/reflect/deus/lang/core.mdl) — core dialect.
- [`lang/PLUGIN-.template.mdl`](../../../packages/reflect/deus/lang/PLUGIN-.template.mdl) — the plugin template.
- [`src/extension/mdl.grammar`](../../../packages/reflect/deus/src/extension/mdl.grammar) — Lezer grammar (use only when chasing syntax questions).

**The `PLUGIN.mdl` IS the design document.** Do not write a separate design doc (e.g., in `agents/superpowers/specs/`). During brainstorming, once the design is approved, write the spec directly as `packages/plugins/plugin-<name>/PLUGIN.mdl`. Use [`packages/reflect/deus/lang/PLUGIN-.template.mdl`](../../../packages/reflect/deus/lang/PLUGIN-.template.mdl) as the template and `packages/plugins/plugin-chess/PLUGIN.mdl` as a reference.

The specification is the source of truth for what the plugin does. It must be:

- **Created first** — this is the first file written for any new plugin, before any code.
- **Kept up-to-date** — when features are discussed, added, or changed, update the spec first.
- **Used for testing** — derive user feature tests and acceptance criteria from the spec's `feat`, `req`, and `test` blocks.
- **Reviewed before implementation** — the user must approve the PLUGIN.mdl before code is written.

When the user discusses new features or changes, update `PLUGIN.mdl` to reflect the agreed requirements before implementing.
Tests should verify the behaviors described in the spec.

## Workflow

- Use `/superpowers:writing-plans` (Subagent-Driven) for non-trivial plugin work.

## Creating a New Plugin

When asked to create a new plugin, start with a minimal skeleton before adding features. The skeleton should include:

1. `PLUGIN.mdl` — specification starter with initial feature/requirement blocks.
2. `README.md` — brief description of the plugin's purpose.
3. `package.json` — with `"private": true`, `#imports` aliases, and minimal dependencies.
4. `moon.yml` — with `compile` entry points.
5. `src/meta.ts` — plugin metadata (id, name, description, icon, iconHue).
6. `src/translations.ts` — initial translation resources.
7. `src/FooPlugin.tsx` — minimal `Plugin.define(meta).pipe()` with surface and translations modules.
8. `src/index.ts` — exports only meta and plugin.
9. `src/types/` — one schema type with `make()` factory.
10. `src/capabilities/index.ts` — single `Capability.lazy()` for ReactSurface.
11. `src/capabilities/react-surface.tsx` — one surface for the `article` role.
12. `src/containers/` — one container (e.g., `FooArticle`) with lazy export and basic storybook.
13. `src/components/` — empty barrel, ready for primitives.

Build and lint the skeleton before adding features.
Add capabilities incrementally as needed (operations, blueprints, settings, etc.).
Register the plugin with `composer-app`.

## Directory Structure

```
plugin-foo/
  package.json
  moon.yml
  PLUGIN.mdl
  src/
    index.ts                # Root entrypoint; exports only the plugin and meta.
    meta.ts                 # Plugin.Meta (id, name, description, icon, iconHue).
    translations.ts         # i18n resources keyed by typename and meta.id.
    FooPlugin.tsx           # Plugin definition via Plugin.define(meta).pipe().
    blueprints/             # AI blueprint definitions.
      index.ts
    capabilities/           # Lazy capability modules (one file each).
      index.ts              # Barrel of Capability.lazy() exports.
      react-surface.tsx
      operation-handler.ts
      blueprint-definition.ts
    components/             # Primitive UI components (no app-framework deps).
      index.ts
      MyComponent/
        index.ts
        MyComponent.tsx
        MyComponent.stories.tsx
    containers/             # Surface components (lazy-loaded, use capabilities).
      index.ts              # lazy(() => import('./X')) exports.
      FooArticle/
        index.ts            # Bridges named -> default export.
        FooArticle.tsx
        FooArticle.stories.tsx
    operations/             # Operation definitions and handlers.
      index.ts
      definitions.ts
    types/                  # ECHO schema definitions.
      index.ts              # Namespace re-export: export * as Foo from './Foo';
      Foo.ts
```

## Concepts

### Component (`src/components/`)

Low-level UI. Must NOT depend on `@dxos/app-framework` or `@dxos/app-toolkit`.
Each component lives in its own subdirectory with an `index.ts` barrel.
Use named exports; no default exports. Create a basic storybook for each.

**Prefer composable Radix-style namespaces for non-trivial components.** Mirror the `Foo.Root / Foo.Toolbar / Foo.Content / Foo.Viewport` pattern used by `Panel.*`, `Card.*`, `Masonry.*`, and `ScrollArea.*` in `@dxos/react-ui` and `@dxos/react-ui-masonry`. The Root provides shared context (data, callbacks, Tile component); subcomponents read it and slot into the outer Panel/ScrollArea structure. This lets containers plug in their own toolbar contents (e.g. MenuBuilder buttons) without forking the component, and keeps the component fully presentation-only.

```tsx
// Pure component namespace — no app-framework deps.
export const FooMasonry = { Root: Root, Toolbar: Toolbar, Content: Content, Viewport: Viewport };

// Container composes:
<FooMasonry.Root items={items} onDelete={handleDelete}>
  <FooMasonry.Toolbar>
    <Menu.Root {...menuActions} attendableId={attendableId}>
      <Menu.Toolbar />
    </Menu.Root>
  </FooMasonry.Toolbar>
  <FooMasonry.Content>
    <FooMasonry.Viewport />
  </FooMasonry.Content>
</FooMasonry.Root>;
```

Sketch the namespace export first when designing a new component; only collapse to a single component if the surface really has no slots.

See: `plugin-chess/src/components/Chessboard/`, `packages/ui/react-ui-masonry/src/Masonry.tsx`

### Container (`src/containers/`)

High-level surface component. Uses capabilities and is referenced by `react-surface`.
Each container lives in its own subdirectory. The subdirectory `index.ts` bridges named to default export (for `React.lazy`).
The top-level `containers/index.ts` uses `lazy(() => import('./X'))` with `: ComponentType<any>` annotation.
Surface components use suffixes matching their role: `Article`, `Card`, `Dialog`, `Popover`, `Settings`.
Create a basic storybook for each.

**If a "component" needs `useCapability`/`useCapabilities`/`useAppGraph`/`useOperationInvoker`, it belongs in `containers/`.** Storybooks won't have a PluginManager — calling capability hooks under `components/` throws. Refactor: take the resolved value (URL, callback, Tile component) as a prop and move the hook one level up.

### Reactivity: wrap subjects with `useObject`

A surface receiving an ECHO subject via `AppSurface.ObjectArticleProps<T>` MUST call `useObject(subject)` and read from the returned snapshot. Without it, mutations to nested arrays/structs (e.g. `Obj.update(obj, m => m.images = [...])`) do not trigger re-render until you navigate away and back — the prop reference stays stable; the subscription lives in `useObject`.

```tsx
const [gallery] = useObject(subject);
// reads (gallery.images) re-render reactively
// writes still go through the original subject:
const handleDelete = (i: number) =>
  Obj.update(subject, (obj) => {
    const m = obj as Obj.Mutable<Gallery.Gallery>;
    m.images = (m.images ?? []).filter((_, idx) => idx !== i);
  });
```

The snapshot type is narrow — cast as needed (`obj as Obj.Mutable<T>` inside `Obj.update`, or `as T` for read access of fields not surfaced on `Snapshot<T>`).

### Toolbar wiring: `MenuBuilder` + `useMenuActions` + `attendableId`

Always thread `attendableId` from `AppSurface.ObjectArticleProps` into `<Menu.Root>`. Don't underscore it as unused — without it, attention-driven contributions don't target the right surface.

```tsx
const actionsAtom = useMemo(
  () =>
    Atom.make(
      (): ActionGraphProps =>
        MenuBuilder.make()
          .action(
            'add',
            { label: ['add.label', { ns: meta.id }], icon: 'ph--plus--regular', disposition: 'toolbar' },
            handleAdd,
          )
          .build(),
    ),
  [handleAdd],
);
const menuActions = useMenuActions(actionsAtom);
return (
  <Panel.Toolbar>
    <Menu.Root {...menuActions} attendableId={attendableId}>
      <Menu.Toolbar />
    </Menu.Root>
  </Panel.Toolbar>
);
```

See: `plugin-sample/src/containers/SampleArticle.tsx`.

**Containers must use standard UI primitives — never custom classNames for layout or styling.** Use:

- `Panel.Root` / `Panel.Toolbar` / `Panel.Content` for container (article, companion, etc.) layout structure.
- `ScrollArea.Root` + `ScrollArea.Viewport` inside `Panel.Content asChild` for scrollable content.
- `Input.Root` / `Input.Label` / `Input.TextInput` for form fields.
- `Button` (with `variant`) for actions.
- `Clipboard.IconButton` for copy-to-clipboard.
- `Toolbar.Root` / `Toolbar.IconButton` for toolbar actions.
- `Card.Root` / `Card.Toolbar` / `Card.Content` for card surfaces.
- `List.Root` for navigable lists that track current (`dx-current`) and selected (`dx-selected`) item states.
- use `react-tabster` for navigation.

IMPORTANT: Any deviation from standard UI components should require permission from the user.

The only acceptable classNames are functional layout hints on `ScrollArea.Viewport` (e.g., `p-4 space-y-4`) or responsive `@container` queries. If you find yourself writing custom styles, you are probably missing an existing UI component.

**Standard article container pattern:**

```tsx
<Panel.Root role={role}>
  <Panel.Toolbar asChild>
    <Toolbar.Root>{/* toolbar content */}</Toolbar.Root>
  </Panel.Toolbar>
  <Panel.Content asChild>
    <ScrollArea.Root orientation='vertical'>
      <ScrollArea.Viewport classNames='p-4 space-y-4'>{/* Input.Root, Button, etc. */}</ScrollArea.Viewport>
    </ScrollArea.Root>
  </Panel.Content>
</Panel.Root>
```

All imports from `@dxos/react-ui`: `Panel`, `ScrollArea`, `Input`, `Button`, `Clipboard`, `Toolbar`, `Card`, `Icon`, `useTranslation`.

See: `plugin-chess/src/containers/ChessArticle/`, `plugin-discord/src/containers/BotArticle/`

### Capability (`src/capabilities/`)

Plugin modules that contribute functionality to the framework. Each is a single file with a default export using `Capability.makeModule()`. The barrel `index.ts` uses only `Capability.lazy()` exports. Do NOT add non-lazy exports.

See: `plugin-chess/src/capabilities/`

#### LayerSpec contributions (`src/capabilities/layer-specs.ts`)

Plugins that contribute Effect services to the process-manager runtime do so via `Capabilities.LayerSpec` entries (see `plugin-client/src/capabilities/layer-specs.ts` for a minimal reference).

Conventions:

- **Declare each spec at module level**, not inside the `Capability.makeModule(Effect.fnUntraced(...))` activation body. Keep the activation block to just the `Capability.contributes(...)` list (+ any conditional contributions that depend on runtime config).
- **Use PascalCase names ending in `LayerSpec`** (`ClientLayerSpec`, `DatabaseLayerSpec`, `RemoteFunctionExecutionSpec`, …). This makes the module-level intent obvious at the callsite.
- **Declare runtime dependencies via `requires`, not via outer-scope closures.** If a spec needs the `Client`, require `ClientService` (or `Capability.Service` + `Capability.get(ClientCapabilities.Client)` inside a `Layer.unwrapEffect(Effect.gen(...))`). If a spec needs contributed capabilities (e.g. operation handlers, blueprint definitions), require `Capability.Service` and resolve them with `Capability.get` / `Capability.getAll` — this keeps the spec portable and the dependency graph explicit.
- **Hard-fail with `invariant` on missing space context or missing space records.** Space-affinity specs that receive a `context` argument should `invariant(context.space, …)` and `invariant(space, …)` on the client lookup — returning a `notAvailable` fallback hides configuration bugs in the layer graph.
- **Activation-conditional specs stay inside the `makeModule` body.** Specs that only apply when a runtime config flag is set (e.g. `runtime.client.edgeFeatures.agents`) can still read that config from the `Client` and conditionally append themselves to the contributions list.

#### Affinity and `LayerSpec.LayerContext`

A spec's `affinity` determines the slice it lives in and which fields of `LayerContext` are populated when its factory runs (see `packages/core/compute/compute/src/LayerSpec.ts`):

| Affinity      | Lifetime                                        | `LayerContext` fields available          |
| ------------- | ----------------------------------------------- | ---------------------------------------- |
| `application` | Process-manager runtime                         | (none — `{}`)                            |
| `space`       | Per space, reused across all processes in space | `space`                                  |
| `process`     | Per spawned process                             | `space`, `conversation`, `process` (pid) |

`conversation` and `process` are **process-affinity only** — a `space`-affinity factory cannot see them. If a service is keyed on `conversation` (e.g. `AiContext.Service`, `AiSession.Service`), it must be `process`-affinity even though it depends on space-affinity services like `Database.Service` and `Feed.FeedService`. The `LayerStack` initialises lower-affinity slices first, so process specs can require space services without issue.

The `LayerContext.conversation` field is fed from the spawn `environment.conversation`, which in turn comes from `Operation.invoke(..., { conversation })` or `Operation.withInvocationOptions({ conversation })`. Operations dispatched by `TriggerDispatcher` also inherit `space`/`conversation` from the parent spawn environment.

#### Handling missing context fields

`LayerSpec.make`'s factory must return `Layer<Provides, never, Requires>` — the error channel is `never`, so the layer body cannot use typed `Effect.fail` to signal "this context is invalid". Use `Effect.die(new ServiceNotAvailableError(tag.key))` inside the `Layer.scoped` body when a required `LayerContext` field is missing:

```ts
LayerSpec.make(
  { affinity: 'process', requires: [Database.Service, Feed.FeedService], provides: [AiContext.Service] },
  (context) =>
    Layer.scoped(
      AiContext.Service,
      Effect.gen(function* () {
        if (!context.conversation) {
          return yield* Effect.die(new ServiceNotAvailableError(AiContext.Service.key));
        }
        const feed = yield* Database.resolve(DXN.parse(context.conversation), Feed.Feed).pipe(Effect.orDie);
        const runtime = yield* Effect.runtime<Feed.FeedService>();
        const binder = yield* acquireReleaseResource(() => new AiContext.Binder({ feed, runtime }));
        return { binder };
      }),
    ),
);
```

The die surfaces as a defect through `LayerStack`, and the dispatcher's `causeToError` extracts the original `ServiceNotAvailableError` message for logs. Do NOT widen the spec output type with `as unknown as` casts to return `Layer.empty` — that hides the fact that the slice failed to materialise.

#### `LayerStack` pruning of unsatisfiable specs

A slice contains every spec at its affinity, but the `LayerStack` prunes specs whose `requires` aren't satisfied by the parent slice (or by earlier specs in this slice). The slice still initialises with the surviving specs; lookups for tags from dropped specs fail with a precise `ServiceNotAvailable` at resolve time. This lets a conversation-scoped `process` spec (like `AiContextSpec` requiring `Database.Service`) coexist with `process` ops that spawn without a `space`/`conversation` context.

Practical consequences:

- Declare each spec's true `requires` — there is no penalty for an unsatisfied requirement when nobody is asking for what the spec provides.
- Don't bundle unrelated services in one spec just to share a factory. A spec is the unit of pruning; bundling forces all-or-nothing.
- A failure for tag `X` will report `ServiceNotAvailable: X`, not the missing transitive dependency. If you need to debug WHY a spec was dropped, check the `pruned layer specs with unsatisfied requirements` log line emitted by `Slice.init` (`packages/core/compute-runtime/src/LayerStack.ts`).

See the `process slice initialises even when an unrelated process-affinity spec has unsatisfied requirements` test in `LayerStack.test.ts` for the canonical scenario.

#### Inline `Effect.provideService` is not enough

Providing a service inline (`Effect.provideService(AiContext.Service, …)` or `Layer.succeed(AiContext.Service, …)` via `Effect.provide(...)`) only applies to the calling fiber. The moment `Operation.invoke(child)` crosses a process boundary, the child spawn uses its own `ServiceResolver`/`LayerStack` and the inline provider is invisible. If any code path can `Operation.invoke` (or `schedule`) an op that requires the service, register a production `LayerSpec` for it — don't rely on inline providers alone.

### Schema (`src/types/`)

ECHO type definitions using Effect Schema with `Type.makeObject()`, `LabelAnnotation`, and `Annotation.IconAnnotation`. Use namespace re-exports (e.g., `export * as Chess from './Chess'`). Include a `make()` factory function using `Obj.make()`.

See: `plugin-chess/src/types/Chess.ts`

### Operations (`src/operations/`)

Operation definitions use `Operation.make()` with meta, input/output schemas, and services. Handlers use `Operation.withHandler()` with Effect generators. The barrel exports definitions and a lazy `OperationHandlerSet`.

See: `plugin-chess/src/operations/`

## Plugin Definition

The main plugin file wires everything together using `Plugin.define(meta).pipe()` with `AppPlugin` helper methods:

| Method                         | Purpose                        | Activation Event          |
| ------------------------------ | ------------------------------ | ------------------------- |
| `addSurfaceModule`             | React surface components       | `SetupReactSurface`       |
| `addMetadataModule`            | Type metadata (icon, creation) | `SetupMetadata`           |
| `addSchemaModule`              | ECHO type registration         | `SetupSchema`             |
| `addOperationHandlerModule`    | Operation handlers             | `SetupOperationHandler`   |
| `addTranslationsModule`        | i18n resources                 | `SetupTranslations`       |
| `addBlueprintDefinitionModule` | AI blueprints                  | `SetupArtifactDefinition` |
| `addSettingsModule`            | Plugin settings                | `SetupSettings`           |
| `addAppGraphModule`            | Graph builder extensions       | `SetupAppGraph`           |
| `addCommandModule`             | CLI commands                   | `Startup`                 |
| `addReactContextModule`        | React context provider         | `Startup`                 |
| `addNavigationResolverModule`  | Navigation resolvers           | `OperationInvokerReady`   |
| `addNavigationHandlerModule`   | Navigation handlers            | `OperationInvokerReady`   |

See: `plugin-chess/src/ChessPlugin.tsx`

## React Surface

Surfaces are contributed via `Capability.contributes(Capabilities.ReactSurface, [...])` with `Surface.create()`.
Common roles: `article`, `section`, `card--content`, `object-properties`, `form-input`, `dialog`.
Common filters: `AppSurface.object(AppSurface.Article, Type)`, `AppSurface.object(AppSurface.Card, Type)`, `AppSurface.objectProperties(Type)`.

See: `plugin-chess/src/capabilities/react-surface.tsx`

## Blueprint Definition

Blueprints provide AI agents with tools and instructions for a domain. Define a blueprint key, gather operations, and use `Blueprint.make()` with `Blueprint.toolDefinitions()`.

See: `plugin-chess/src/blueprints/chess-blueprint.ts`

## Translations

Resources keyed by both typename (for object labels) and `meta.id` (for plugin-scoped strings). Use `useTranslation(meta.id)` in components.

See: `plugin-chess/src/translations.ts`

## package.json

- New packages MUST have `"private": true`.
- Define `#imports` aliases for internal barrels (`#capabilities`, `#components`, `#containers`, `#meta`, `#operations`, `#types`).
- Define `exports` subpaths for anything other plugins need (`./types`, `./operations`).
- Internal `@dxos` deps use `workspace:*`; external deps use `catalog:`.

See: `plugin-chess/package.json`

## moon.yml

Each `package.json` export subpath needs a matching `--entryPoint` in the `compile` task args.

See: `plugin-chess/moon.yml`

## Coding Style

- Use `invariant` over throwing errors to assert function preconditions.
- Use barrel imports (`#components`, `#containers`, etc.) instead of deep relative paths.
- Avoid default exports in `src/components/`. The only default exports are in container `index.ts` files (for `React.lazy`).
- Container-to-container imports use the default import: `import X from '../X';`.
- Use `Panel.Root` with `role` prop in container article/section components.
- All ECHO interfaces must be reactive. Use `useQuery`, `useObject`, atoms, etc.

## Build & Test

```bash
moon run plugin-foo:build
moon run plugin-foo:lint -- --fix
moon run plugin-foo:test
moon run plugin-foo:test-storybook
```

## General Rules

- `src/components/` and `src/containers/` should contain only index files and subdirectories.
- `src/index.ts` exports only the plugin and meta. Keep it minimal.
- If another plugin needs internals, expose dedicated public entrypoints (`types`, `operations`) instead of re-exporting from root.
- Plugins should not depend on another plugin's root entrypoint for broad barrels.
- The `Surface` component provides top-level `<Suspense>` for lazy containers; individual containers only need their own Suspense if they use `React.use()` or render lazy sub-components.
