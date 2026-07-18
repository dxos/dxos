---
name: composer-plugins
description: Use when working on files in packages/plugins/, adding new plugins,
  refactoring plugin components/containers, writing storybooks for plugins,
  or wiring capabilities like react-surface or operation-resolver. For the UI/design-system
  details of plugin components (layout, theming, forms, toolbars, lists, storybook), pair this
  with the composer-ui skill.
---

# Composer Plugins

Exemplar: `packages/plugins/plugin-chess`. Read its source files to understand every pattern below.

**Companion skills.** For building plugin **UI** with the design system — container layout, theme tokens,
forms, toolbars, lists/stacks, reactivity, storybook — use the **composer-ui** skill. For **authoring**
new `@dxos/react-ui` composite primitives (`Foo.Root`/`Foo.Content`), use **composite-components**. This
skill owns plugin _structure_ (capabilities, surfaces, schema, operations) and points at those two for UI.

**Read `MEMORY.md` first** (sibling of this file) for session-logged design/implementation learnings and prior corrections.

**REQUIRED — keep `MEMORY.md` current:** Whenever the user directs a correction (tells you to do something differently, rejects an approach, or specifies a pattern), record it in `MEMORY.md` as part of carrying out that correction — do not defer to session end. Also capture other non-obvious design/implementation details as you learn them.

Update it _appropriately_:

- Append to the current session's dated section, newest first: `## YYYY-MM-DD — <plugin(s)>`. Create it if absent; do not start a second section for the same session.
- Keep it compact and agent-directed: terse imperative bullets, one rule per bullet, name the file/symbol/idiom. No prose, no hedging, no narration of what you did.
- Update or merge an existing bullet instead of adding a near-duplicate; delete bullets proven wrong.
- Record reusable rules, not task specifics. When a rule generalizes beyond one session, promote it into the body of this `SKILL.md` and drop it from `MEMORY.md`.

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

**Required.** Before writing or refactoring any container, capability, operation, skill, or schema, call `mcp__dxos-introspect__list_idioms` and scan for a slug that matches what you're about to build. An idiom is a JSDoc-tagged pinning of the canonical way to do one thing — when one exists, it is the answer, and you should `get_symbol` on the host artifact and follow the pattern rather than reinventing it.

Typical triggers:

- Building a toolbar → look for `org.dxos.react-ui-menu.*` idioms.
- Wiring `useObject` / mutating ECHO subjects → look for ECHO idioms.
- Writing a surface filter, operation handler, skill, or container scaffold → search by the feature word first.

If no idiom matches, proceed using the exemplar (`plugin-chess`); if you find yourself writing something that other plugins will copy, consider adding a new `@idiom` tag (see [`packages/reflect/deus/docs/IDIOMS.md`](../../../packages/reflect/deus/docs/IDIOMS.md) for the format and slug rules).

## Specification

A plugin's design is captured in two artifacts across its lifecycle — a
superpowers **design doc** during the initial build, then a durable
**`PLUGIN.mdl`** that outlives the first session.

### Initial plugin creation (first session)

When creating a brand-new plugin, do NOT start with `PLUGIN.mdl`. Instead:

1. Run the `superpowers:brainstorming` flow and write the approved design to a
   separate design doc under `agents/superpowers/specs/YYYY-MM-DD-<name>-design.md`
   (the DXOS override of the superpowers default `docs/superpowers/…` path).
2. The user approves that design doc before any code is written.
3. Implement Phase 1 against the design doc.
4. **At the end of Phase 1, before opening the PR**, author
   `packages/plugins/plugin-<name>/PLUGIN.mdl` from the design doc and the
   as-built plugin. This is a required pre-PR step — the design doc drove the
   build; `PLUGIN.mdl` is the hand-off spec that subsequent sessions consume.

### `PLUGIN.mdl` — the durable spec

`PLUGIN.mdl` is written in the **MDL** (`.mdl`) language defined by `@dxos/deus`.
The authoritative references live under [`packages/reflect/deus/`](../../../packages/reflect/deus/):

- [`docs/DESIGN.md`](../../../packages/reflect/deus/docs/DESIGN.md) — language specification.
- [`docs/IDIOMS.md`](../../../packages/reflect/deus/docs/IDIOMS.md) — idiom format and `@idiom` JSDoc-tag conventions.
- [`lang/core.mdl`](../../../packages/reflect/deus/lang/core.mdl) — core dialect.
- [`lang/PLUGIN-.template.mdl`](../../../packages/reflect/deus/lang/PLUGIN-.template.mdl) — the plugin template.
- [`src/extension/mdl.grammar`](../../../packages/reflect/deus/src/extension/mdl.grammar) — Lezer grammar (use only when chasing syntax questions).

Use the template as the starting structure and `packages/plugins/plugin-chess/PLUGIN.mdl`
as a reference. Once it exists (i.e. in every session AFTER the initial build),
`PLUGIN.mdl` is the source of truth for what the plugin does. It must be:

- **Present before a new plugin's first PR merges** — created at the close of
  Phase 1 as described above; never omitted.
- **Kept up-to-date** — when features are discussed, added, or changed in a later
  session, update `PLUGIN.mdl` first, before implementing.
- **Used for testing** — derive user feature tests and acceptance criteria from
  the spec's `feat`, `req`, and `test` blocks.
- **Reviewed before implementation** — for changes to an existing plugin, the
  user approves the updated `PLUGIN.mdl` before code is written.

## Workflow

- Use `/superpowers:writing-plans` (Subagent-Driven) for non-trivial plugin work.

## Creating a New Plugin

When asked to create a new plugin, first produce the superpowers design doc (see
Specification above), then start with a minimal skeleton before adding features.
`PLUGIN.mdl` is NOT part of the initial skeleton — it is authored at the end of
Phase 1, before the PR. The skeleton should include:

1. `README.md` — brief description of the plugin's purpose.
2. `package.json` — with `"private": true`, `#plugin` import alias, `./plugin` export subpath, and minimal dependencies.
3. `moon.yml` — with `compile` entry points for both `src/index.ts` and `src/plugin.ts`.
4. `src/meta.ts` — plugin metadata (id, name, description, icon, iconHue).
5. `src/translations.ts` — initial translation resources.
6. `src/FooPlugin.tsx` — minimal `Plugin.define(meta).pipe()` with surface and translations modules, plus `export default FooPlugin`.
7. `src/plugin.ts` — lazy wrapper: `export const FooPlugin = Plugin.lazy(meta, () => import('#plugin'))`. Re-export any `OperationHandlerSet` here too.
8. `src/index.ts` — exports only `meta` and types/operations. **Never exports the plugin instance.**
9. `src/types/` — one schema type with `make()` factory.
10. `src/capabilities/index.ts` — single `Capability.lazy()` for ReactSurface.
11. `src/capabilities/react-surface.tsx` — one surface for the `article` role.
12. `src/containers/` — one container (e.g., `FooArticle`) with lazy export and basic storybook.
13. `src/components/` — empty barrel, ready for primitives.

Build and lint the skeleton before adding features.
Add capabilities incrementally as needed (operations, skills, settings, etc.).
Register the plugin with `composer-app`.

## Directory Structure

```
plugin-foo/
  package.json
  moon.yml
  PLUGIN.mdl
  src/
    index.ts                # Root entrypoint; exports only meta and types/operations — never the plugin instance.
    plugin.ts               # Plugin.lazy() wrapper; consumed via @dxos/plugin-foo/plugin.
    meta.ts                 # Plugin.Meta (id, name, description, icon, iconHue).
    translations.ts         # i18n resources keyed by typename and meta.id.
    FooPlugin.tsx           # Plugin definition via Plugin.define(meta).pipe().
    skills/             # AI skill definitions.
      index.ts
    capabilities/           # Lazy capability modules (one file each).
      index.ts              # Barrel of Capability.lazy() exports.
      react-surface.tsx
      operation-handler.ts
      skill-definition.ts
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

Low-level UI (plugin/src/components, react-ui-\*). Must NOT depend on `@dxos/app-framework` or `@dxos/app-toolkit`.
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

### UI: forms, theming, toolbars, cards, layout

The detailed rules for building plugin UI with the design system live in the **composer-ui** skill
(`.agents/skills/composer-ui/SKILL.md`). Consult it whenever you write a container/component, reach for a
Tailwind color class, build a toolbar, edit an object with a form, or add a story. It covers: the
`@dxos/react-ui*` packages, verified theme tokens (never invent `bg-input`/`text-primary`), the standard
`Panel` + `ScrollArea` container layout (no wrapper divs), `MenuBuilder` + `useMenuActions` + `Menu.Root`
toolbar wiring (threading `attendableId`), schema-driven `Form` editing (no native inputs), the `Card`
3-slot subgrid, icons, attention/density, reactivity (`useObject` for ECHO objects passed into
components), translations, and storybook setup. For authoring brand-new `@dxos/react-ui` primitives, see
the **composite-components** skill.

### Capability (`src/capabilities/`)

Plugin modules that contribute functionality to the framework. Each is a single file with a default export using `Capability.makeModule()`. The barrel `index.ts` uses only `Capability.lazy()` exports. Do NOT add non-lazy exports.

See: `plugin-chess/src/capabilities/`

#### Cross-plugin capabilities (`src/types/XCapabilities.ts`)

Some plugins expose capability keys for other plugins to implement — a decoupled provider/extension
contract. See `packages/plugins/AUDIT.md` for the current registry.

**Naming convention** — use one of four suffixes depending on the role:

| Suffix         | Use when                                                               | Example                                                                                                        |
| -------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `Provider`     | The contributor supplies data, a factory, or an array of extensions    | `MapCapabilities.MarkerProvider`, `GameCapabilities.VariantProvider`, `MarkdownCapabilities.ExtensionProvider` |
| `Service`      | The contributor performs active async work (search, routing, …)        | `TripCapabilities.BookingService`, `TripCapabilities.RoutingService`                                           |
| `EventHandler` | The contributor registers callbacks for host-plugin lifecycle events   | `CallsCapabilities.EventHandler`                                                                               |
| `Config`       | The contributor supplies a declarative config object keyed by typename | `AppCapabilities.CommentConfig` (consumed by plugin-comments)                                                  |

When the contract is app-wide rather than owned by one plugin (e.g. comment support), the capability
key lives in `AppCapabilities` (`@dxos/app-toolkit`) instead of a plugin's `src/types/XCapabilities.ts`;
plugin-comments re-exports `AppCapabilities.CommentConfig` as `CommentCapabilities.CommentConfig`.

**Where to define** — add the `Capability.make<T>()` call in the defining plugin's
`src/types/XCapabilities.ts`, namespace-exported from `src/types/index.ts`:

```ts
// packages/plugins/plugin-foo/src/types/FooCapabilities.ts
export const BarProvider = Capability.make<BarProvider>(`${meta.id}.capability.bar-provider`);
```

Expose it via a `./types` subpath in `package.json` (see `plugin-game/package.json` as a reference).
The `--entryPoint=src/types/index.ts` entry in `moon.yml` is typically already present.

**Where to implement** — the donor plugin places its contribution in a dedicated file in
`src/capabilities/`, named after the capability it implements (e.g. `routing-service.ts`,
`markdown-extension.ts`). Wire it via `Capability.lazy` in `src/capabilities/index.ts`.

**How to import the key** — use the `/types` subpath, not the root entrypoint:

```ts
// ✓
import { FooCapabilities } from '@dxos/plugin-foo/types';
// ✗ — pulls in the full barrel (meta, hooks, operations, …)
import { FooCapabilities } from '@dxos/plugin-foo';
```

**Reference implementations:**

- Provider: `plugin-osrm/src/capabilities/routing-service.ts` → `TripCapabilities.RoutingService`
- Enumeration Provider: `plugin-chess/src/capabilities/game-variant.ts` → `GameCapabilities.VariantProvider`
- EventHandler: `plugin-meeting/src/capabilities/call-extension.ts` → `CallsCapabilities.EventHandler`
- Config: `plugin-markdown/src/capabilities/comment-config.ts` → `AppCapabilities.CommentConfig`

#### Worked example: comments (`AppCapabilities.CommentConfig`)

plugin-comments owns the comments companion + threads UI but knows nothing about which types are
commentable. A plugin opts a typename in by contributing a `CommentConfig` and wiring it with
`AppPlugin.addCommentConfigModule({ activate: CommentConfig })`:

- `comments: 'unanchored'` — comments attach to the object as a whole; no other integration needed
  (see `plugin-sketch`, `plugin-table`, `plugin-bookmarks`, `plugin-video`).
- `comments: 'anchored'` — comments anchor to a selection range. Requires the subject's editor to
  publish selections into `AttentionCapabilities.Selection` keyed by `Obj.getURI(subject)`, plus
  `getAnchorLabel` / `scrollToAnchor` in the config (see `plugin-markdown`, `plugin-sheet`). The
  comment-sync CodeMirror extension (`plugin-comments/src/extensions/threads.ts`) is injected into
  the markdown editor via `MarkdownCapabilities.ExtensionProvider` and currently only supports
  `Markdown.Document` content — a custom editor (e.g. a `Ref<Text>` field rendered with
  `useTextEditor`) cannot get anchored comments without equivalent plumbing.

plugin-comments resolves configs by typename (`getAll(AppCapabilities.CommentConfig).find(({ id }) =>
id === typename)`) in its app-graph builder, which offers the comments companion and the toolbar
"Add comment" action for matching nodes.

#### LayerSpec contributions (`src/capabilities/layer-specs.ts`)

Plugins that contribute Effect services to the process-manager runtime do so via `Capabilities.LayerSpec` entries (see `plugin-client/src/capabilities/layer-specs.ts` for a minimal reference).

Conventions:

- **Declare each spec at module level**, not inside the `Capability.makeModule(Effect.fnUntraced(...))` activation body. Keep the activation block to just the `Capability.contributes(...)` list (+ any conditional contributions that depend on runtime config).
- **Use PascalCase names ending in `LayerSpec`** (`ClientLayerSpec`, `DatabaseLayerSpec`, `RemoteFunctionExecutionSpec`, …). This makes the module-level intent obvious at the callsite.
- **Declare runtime dependencies via `requires`, not via outer-scope closures.** If a spec needs the `Client`, require `ClientService` (or `Capability.Service` + `Capability.get(ClientCapabilities.Client)` inside a `Layer.unwrapEffect(Effect.gen(...))`). If a spec needs contributed capabilities (e.g. operation handlers, skill definitions), require `Capability.Service` and resolve them with `Capability.get` / `Capability.getAll` — this keeps the spec portable and the dependency graph explicit.
- **Hard-fail with `invariant` on missing space context or missing space records.** Space-affinity specs that receive a `context` argument should `invariant(context.space, …)` and `invariant(space, …)` on the client lookup — returning a `notAvailable` fallback hides configuration bugs in the layer graph.
- **Activation-conditional specs stay inside the `makeModule` body.** Specs that only apply when a runtime config flag is set (e.g. `runtime.client.edgeFeatures.agents`) can still read that config from the `Client` and conditionally append themselves to the contributions list.

#### Affinity and `LayerSpec.LayerContext`

A spec's `affinity` determines the slice it lives in and which fields of `LayerContext` are populated when its factory runs (see `packages/core/compute/compute/src/LayerSpec.ts`):

| Affinity      | Lifetime                                        | `LayerContext` fields available          |
| ------------- | ----------------------------------------------- | ---------------------------------------- |
| `application` | Process-manager runtime                         | (none — `{}`)                            |
| `space`       | Per space, reused across all processes in space | `space`                                  |
| `process`     | Per spawned process                             | `space`, `conversation`, `process` (pid) |

`conversation` and `process` are **process-affinity only** — a `space`-affinity factory cannot see them. If a service is keyed on `conversation` (e.g. `AiContext.Service`, `AiSession.Service`), it must be `process`-affinity even though it depends on space-affinity services like `Database.Service`. The `LayerStack` initialises lower-affinity slices first, so process specs can require space services without issue.

The `LayerContext.conversation` field is fed from the spawn `environment.conversation`, which in turn comes from `Operation.invoke(..., { conversation })` or `Operation.withInvocationOptions({ conversation })`. Operations dispatched by `TriggerDispatcher` also inherit `space`/`conversation` from the parent spawn environment.

#### Handling missing context fields

`LayerSpec.make`'s factory must return `Layer<Provides, never, Requires>` — the error channel is `never`, so the layer body cannot use typed `Effect.fail` to signal "this context is invalid". Use `Effect.die(new ServiceNotAvailableError(tag.key))` inside the `Layer.scoped` body when a required `LayerContext` field is missing:

```ts
LayerSpec.make({ affinity: 'process', requires: [Database.Service], provides: [AiContext.Service] }, (context) =>
  Layer.scoped(
    AiContext.Service,
    Effect.gen(function* () {
      if (!context.conversation) {
        return yield* Effect.die(new ServiceNotAvailableError(AiContext.Service.key));
      }
      const feed = yield* Database.resolve(DXN.parse(context.conversation), Feed.Feed).pipe(Effect.orDie);
      const runtime = yield* Effect.runtime<Database.Service>();
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

Handler file shape (mirror `plugin-trip/src/operations/add-segment.ts`):

- Default-export the piped handler: `export default Op.pipe(Operation.withHandler(...), Operation.opaqueHandler)`.
- Pass runtime layers as the 2nd arg to `Effect.fn` (e.g. `Effect.provide(FetchHttpClient.layer)`), not an inner nested `Effect.gen` + `.pipe(Effect.provide(...))`.
- Keep the handler body linear; put pure mapping in module-level helpers above the export.
- Dedup/query transforms: prefer `Feed.query(...).run.pipe(Effect.map(...))` chains with Effect `Array`/`Predicate` over imperative loops.

See: `plugin-chess/src/operations/`, `plugin-trip/src/operations/add-segment.ts`, `plugin-chess-com/src/operations/sync-games.ts`

## Plugin Definition

The main plugin file wires everything together using `Plugin.define(meta).pipe()` with `AppPlugin` helper methods:

| Method                        | Purpose                        | Activation Event          |
| ----------------------------- | ------------------------------ | ------------------------- |
| `addSurfaceModule`            | React surface components       | `SetupReactSurface`       |
| `addMetadataModule`           | Type metadata (icon, creation) | `SetupMetadata`           |
| `addSchemaModule`             | ECHO type registration         | `SetupSchema`             |
| `addCommentConfigModule`      | Comment config (per typename)  | `SetupSchema`             |
| `addOperationHandlerModule`   | Operation handlers             | `SetupOperationHandler`   |
| `addTranslationsModule`       | i18n resources                 | `SetupTranslations`       |
| `addSkillDefinitionModule`    | AI skills                      | `SetupArtifactDefinition` |
| `addSettingsModule`           | Plugin settings                | `SetupSettings`           |
| `addAppGraphModule`           | Graph builder extensions       | `SetupAppGraph`           |
| `addCommandModule`            | CLI commands                   | `Startup`                 |
| `addReactContextModule`       | React context provider         | `Startup`                 |
| `addNavigationResolverModule` | Navigation resolvers           | `OperationInvokerReady`   |
| `addNavigationHandlerModule`  | Navigation handlers            | `OperationInvokerReady`   |

See: `plugin-chess/src/ChessPlugin.tsx`

### Module activation ordering

Modules do **not** activate in registration order. Each module declares an
event that triggers it (`activatesOn`), and ordering between modules is
expressed through **shared activation events** — modules never reference each
other directly. Two levers on `Plugin.addModule({...})`:

- **`firesAfterActivation: [Event]`** — after this module's `activate` body
  finishes, the framework fires `Event`; any module with `activatesOn: Event`
  then runs. Use to publish "I'm ready" (e.g. `ClientEvents.ClientReady`).
- **`firesBeforeActivation: [Event]`** — before this module's `activate` runs,
  the framework activates `Event`'s contributors and **waits** for them. Use to
  force a prerequisite (e.g. schema/migration setup) ahead of this module.

To run module **B after** module A: A declares `firesAfterActivation: [E]`, B
declares `activatesOn: E`. To force setup **before** B: B declares
`firesBeforeActivation: [E]`. Combine events with `ActivationEvent.oneOf(...)`
/ `allOf(...)`.

Canonical example (idiom `org.dxos.app-framework.moduleActivationOrdering`):
`plugin-client/src/ClientPlugin.ts` — the `Client` module fires
`ClientEvents.ClientReady` after activating; `SchemaDefs`/`Migrations` listen on
it and use `firesBeforeActivation` to sequence setup ahead of themselves.

## React Surface

Surfaces are contributed via `Capability.contributes(Capabilities.ReactSurface, [...])` with `Surface.create()`.
Common roles: `article`, `section`, `card--content`, `object-properties`, `form-input`, `dialog`.
Common filters: `AppSurface.object(AppSurface.Article, Type)`, `AppSurface.object(AppSurface.Card, Type)`, `AppSurface.objectProperties(Type)`.

See: `plugin-chess/src/capabilities/react-surface.tsx`

## Skill Definition

Skills provide AI agents with tools and instructions for a domain. Define a skill key, gather operations, and use `Skill.make()` with `Skill.toolDefinitions()`.

See: `plugin-chess/src/skills/chess-skill.ts`

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
- Never hand-roll native `<input>`/`<textarea>`/`<select>` or invent color tokens (`bg-input`, `text-primary`). Edit objects with `Form` + schema and use `@dxos/react-ui` primitives / real `@dxos/react-ui-theme` tokens. See the **composer-ui** skill.

## Build & Test

```bash
moon run plugin-foo:build
moon run plugin-foo:lint -- --fix
moon run plugin-foo:test
moon run plugin-foo:test-storybook
```

## General Rules

- `src/components/` and `src/containers/` should contain only index files and subdirectories.
- **Two-entrypoint rule**: `src/index.ts` exports only `meta` and types/operations — never the plugin instance. `src/plugin.ts` holds the `Plugin.lazy()` wrapper and is the `./plugin` subpath. Consumers import from `@dxos/plugin-foo/plugin`; the root entry is for types/operations only.
- `src/FooPlugin.ts` (the `Plugin.define().pipe()` implementation) must have `export default FooPlugin` so `Plugin.lazy(() => import('#plugin'))` can resolve it.
- If another plugin needs internals, expose dedicated public entrypoints (`types`, `operations`) instead of re-exporting from root.
- Plugins should not depend on another plugin's root entrypoint for broad barrels.
- The `Surface` component provides top-level `<Suspense>` for lazy containers; individual containers only need their own Suspense if they use `React.use()` or render lazy sub-components.
