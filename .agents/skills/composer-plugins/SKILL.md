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

### Reading an operation's key and input shape

`list_operations` does **not** enumerate operations — it returns one row per
`Capabilities.OperationHandler` contribution, i.e. where each plugin's handler file lives. The
definitions live under a `<Plugin>Operation` symbol — a `namespace` in `plugin-space`, a module of
top-level exports in `plugin-markdown` — so go through the symbol tools:

1. `list_plugins({ id: 'space' })` → the exact plugin id, when you only have a loose name.
2. `find_symbol({ query: 'SpaceOperation' })` → `@dxos/plugin-space#SpaceOperation`.
3. `get_symbol({ ref: '@dxos/plugin-space#SpaceOperation', include: ['source'] })` → every
   definition with its `meta.key`, `input`, `output` and `services`.

Read `services` while you are there: a definition listing `Database.Service` needs a `spaceId` at
invoke time, which is invisible from the key alone.

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

### Package docs go in `docs/`, never the package root

Every markdown file a plugin owns other than `README.md` lives under
`packages/plugins/plugin-<name>/docs/` — `docs/DESIGN.md`, `docs/AUDIT.md`,
`docs/TESTING.md`, and so on (see `plugin-assistant/docs/`, `plugin-inbox/docs/`).
The package root holds only `README.md`, `PLUGIN.mdl`, and build config; a
`DESIGN.md` sitting beside `package.json` is a mistake to move, not a variant to
match. `README.md` links into `docs/` rather than restating it.

This is about the package root staying scannable — a reader opening the plugin
should see config and `src/`, with prose one directory away.

### Initial plugin creation (first session)

When creating a brand-new plugin, do NOT start with `PLUGIN.mdl`. Instead:

1. Run the `superpowers:brainstorming` flow and write the approved design to
   `packages/plugins/plugin-<name>/docs/DESIGN.md`, then add a short stub at
   `agents/superpowers/specs/YYYY-MM-DD-<name>-design.md` that links to it. The
   doc ships with the package it describes and the specs index still finds it;
   the stub carries a link and nothing else, so there is one source of truth.
   (`agents/superpowers/specs/` is the DXOS override of the superpowers default
   `docs/superpowers/…` path; a design doc that belongs to no package is written
   there directly.)
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
as a reference. `PLUGIN.mdl` is a **record of what has been built — not a
working document**. Design exploration for new features (in any session) happens
in a design doc under the plugin's `docs/` (indexed from `agents/superpowers/specs/`);
`PLUGIN.mdl` is updated only after the design AND implementation have settled. It must be:

- **Present before a new plugin's first PR merges** — created at the close of
  Phase 1 as described above; never omitted.
- **Updated after the work settles** — when features are added or changed,
  brainstorm and implement against a design doc, then bring `PLUGIN.mdl` in
  line with the as-built plugin before the PR (never edit it speculatively
  up front).
- **Used for testing** — derive user feature tests and acceptance criteria from
  the spec's `feat`, `req`, and `test` blocks.

### Every new plugin ships a QA flow and a demo video

Two artifacts, both authored at the close of Phase 1 alongside `PLUGIN.mdl` and
both required before the plugin's first PR merges:

1. **A `## QA` section in `PLUGIN.mdl`** holding at least one `flow QA-n` block
   in the QA dialect ([`lang/qa.mdl`](../../../packages/reflect/deus/lang/qa.mdl);
   `plugin-chess/PLUGIN.mdl` is the reference). One flow covering the plugin's
   primary user journey end to end is the minimum. Its execution rules are not
   style advice — read them before authoring, especially Rule 5 (assertions must
   be falsifiable against a dirty fixture) and Rule 7 (`before` / `test` /
   `after`).
2. **A recorded demo of that flow** against the running app, per the
   `recording-demos` skill: drive the flow's `do:` steps one gesture at a time,
   caption each step with its `do:` text verbatim, and judge `expect:` from the
   screen. Attach the `.webm` to the conversation and commit a contact sheet or
   stills for the PR body — never the video.

**Write the flow first, then record it.** A demo improvised against the app
proves the app runs; a demo that executes a written flow proves the spec and the
app agree, and the recording is what sets the flow's `status:`. Where they
disagree, that is a finding — report it, and fix whichever is wrong.

## Workflow

- Use `/superpowers:writing-plans` (Subagent-Driven) for non-trivial plugin work.
- **Show the change running, in the PR.** A plugin PR is a change to what the app renders, so a
  reviewer should not have to build it to see it. Record the flow or take the stills with
  **recording-demos**, then publish them per **hosting-artifacts**
  (`.agents/skills/hosting-artifacts/SKILL.md`) and link them from the PR body — never commit a video
  or a screenshot to make it visible. For a fix to rendered output, a before/after pair from one build
  (see **composer-ui**) beats a clip.

## Creating a New Plugin

When asked to create a new plugin, first produce the superpowers design doc (see
Specification above), then start with a minimal skeleton before adding features.
`PLUGIN.mdl` is NOT part of the initial skeleton — it is authored at the end of
Phase 1, before the PR. The skeleton should include:

1. `README.md` — brief description of the plugin's purpose, linking to `docs/DESIGN.md`.
2. `dx.config.ts` — `Config2.make({ plugin: { … } })` with key, name, author, description, icon, and a **quality tier tag** (see below).
3. `package.json` — with `"private": true`, `#plugin` import alias, `./plugin` export subpath, and minimal dependencies.
4. `moon.yml` — with `compile` entry points for both `src/index.ts` and `src/plugin.ts`.
5. `src/meta.ts` — plugin metadata (id, name, description, icon, iconHue).
6. `src/translations.ts` — initial translation resources.
7. `src/FooPlugin.tsx` — minimal `Plugin.define(meta).pipe()` with surface and translations modules, plus `export default FooPlugin`.
8. `src/plugin.ts` — lazy wrapper: `export const FooPlugin = Plugin.lazy(meta, () => import('#plugin'))`. Re-export any `OperationHandlerSet` here too.
9. `src/index.ts` — exports only `meta` and types/operations. **Never exports the plugin instance.**
10. `src/types/` — one schema type with `make()` factory.
11. `src/capabilities/index.ts` — single `AppCapability.surface()` for ReactSurface (declare its `roles`).
12. `src/capabilities/react-surface.tsx` — one surface for the `article` role.
13. `src/containers/` — one container (e.g., `FooArticle`) with lazy export and basic storybook.
14. `src/components/` — empty barrel, ready for primitives.

Build and lint the skeleton before adding features.
Add capabilities incrementally as needed (operations, skills, settings, etc.).
Register the plugin with `composer-app`: `FooPlugin.make()` in `getPlugins`, and its key in the `isDev` block of `getDefaults` unless the plugin hits a permission-gated API on activation (rule 5 under **Activation waves**).

Once the plugin contributes a navtree section, apply both rules under **App graph** below — gate the section on a non-empty query, and default the create-object `targetNodeId` to the node that lists the objects.

### Quality tiers

Every plugin MUST declare exactly one quality tier as the FIRST entry of
`plugin.tags` in `dx.config.ts`. A new plugin defaults to `labs` — promotion is a
deliberate, separate decision, never the scaffold's default.

| Tier     | Meaning                                                                                                                                                                                                                      |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `system` | Core infrastructure. Force-enabled and not user-toggleable; derived in `plugin-manager.ts` from `tags.includes('system')`. Also omit the key from `getDefaults` in `composer-app/src/plugin-defs.tsx` — redundant once core. |
| `beta`   | Stable enough to lead with. Shown in the registry's Recommended category.                                                                                                                                                    |
| `alpha`  | A real feature, still moving. Also shown in Recommended.                                                                                                                                                                     |
| `labs`   | Experimental, thin, dev-only, or platform-gated. **The default for a new plugin.**                                                                                                                                           |

```ts
tags: ['labs'],
```

Secondary tags (`connector`, `game`, `assistant`, `travel`) follow the tier:
`tags: ['labs', 'connector']`. Add `alpha`/`beta`/`labs`/`system` to
`RegistryTagType` in `plugin-registry/src/types.ts` — a new secondary tag needs
no change there, but an unlisted tag renders without a hue.

Do NOT leave a plugin untagged. `getCategoryPredicate` in
`plugin-registry/src/categories.ts` selects Recommended by an explicit
`beta`/`alpha` allowlist, so an untagged plugin silently appears in no category
but `bundled`.

## Directory Structure

```text
plugin-foo/
  package.json
  moon.yml
  dx.config.ts             # Plugin manifest; carries the quality tier in `plugin.tags`.
  PLUGIN.mdl
  README.md                # The only markdown at the root; links into docs/.
  docs/                    # Everything else the package documents.
    DESIGN.md
  src/
    index.ts                # Root entrypoint; exports only meta and types/operations — never the plugin instance.
    plugin.ts               # Plugin.lazy() wrapper; consumed via @dxos/plugin-foo/plugin.
    meta.ts                 # Plugin.Meta (id, name, description, icon, iconHue).
    translations.ts         # i18n resources keyed by typename and meta.id.
    paths.ts                # Canonical qualified graph paths (only if the plugin owns navtree nodes).
    FooPlugin.tsx           # Plugin definition via Plugin.define(meta).pipe().
    skills/             # AI skill definitions.
      index.ts
    capabilities/           # Lazy capability modules (one file each).
      index.ts              # Barrel of maker / Capability.lazyModule() exports.
      react-surface.tsx
      operation-handler.ts
      skill-definition.ts
      app-graph-builder.ts  # Navtree sections, child nodes, actions.
      create-object.ts      # SpaceCapabilities.CreateObjectEntry per type.
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

**Before committing UI, grep the diff for dead classes.** The `tailwindcss-logical` dialect
(`pis-*`, `pbs-*`, `pli-*`, `mis-*`, `is-*`, `bs-*`, `min-bs-*`, …) was dropped in the Tailwind v4
migration and now compiles to nothing — silently, so nothing errors and nothing lints. It is the
highest-frequency UI regression in this repo, and worst when the dead class was load-bearing (a
`min-bs-*` height floor, a `min-is-0` letting a grid child shrink), because the failure surfaces far
from its cause. Replacement table and the grep are in **composer-ui** § "Sizing vs logical utilities".

### Capability (`src/capabilities/`)

Plugin modules that contribute functionality to the framework. Each is a single file with a default export using `Capability.makeModule()`. The barrel `index.ts` uses only makers (`AppCapability.*`) or `Capability.lazyModule()` exports. Do NOT add non-lazy exports.

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

- **Declare each spec at module level**, not inside the `Capability.makeModule(Effect.fnUntraced(...))` activation body. Keep the activation block to just the `Capability.contribute(...)` list (+ any conditional contributions that depend on runtime config).
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

Operation definitions use `Operation.make()` with meta, input/output schemas, and services. Handlers use `Operation.withHandler()` with Effect generators. The barrel exports definitions and an `OperationHandlerSet.lazy([...])` built from `Def.pipe(Operation.lazyHandler(() => import('./handler')))` pairings, which type-check the definition against its handler module.

Handler file shape (mirror `plugin-trip/src/operations/add-segment.ts`):

- Default-export the piped handler: `export default Op.pipe(Operation.withHandler(...), Operation.opaqueHandler)`.
- Pass runtime layers as the 2nd arg to `Effect.fn` (e.g. `Effect.provide(FetchHttpClient.layer)`), not an inner nested `Effect.gen` + `.pipe(Effect.provide(...))`.
- Keep the handler body linear; put pure mapping in module-level helpers above the export.
- Dedup/query transforms: prefer `Feed.query(...).run.pipe(Effect.map(...))` chains with Effect `Array`/`Predicate` over imperative loops.

See: `plugin-chess/src/operations/`, `plugin-trip/src/operations/add-segment.ts`, `plugin-chess-com/src/operations/sync-games.ts`

### App graph (`src/capabilities/app-graph-builder.ts`)

Extensions contribute navtree sections, their child nodes, and actions on any node. Assemble with `const extensions = yield* Effect.all([...])` then `Capability.contribute(AppCapabilities.AppGraphBuilder, extensions)` — the raw array fails the `BuilderExtensions` typecheck. Wire with `AppCapability.appGraphBuilder`.

Section hub: one extension matching `AppNodeMatcher.whenNavTreeGroup(GraphPath.GroupTypes.<group>)` → `AppNode.makeSection({...})`, a second matching `node.type === SECTION_TYPE && isSpace(node.properties.space)` → the child nodes. Use `TypeSection.createTypeSectionExtension` when the section is keyed by typename.

**Gate the section on content** — the connector queries the objects it lists and returns `Effect.succeed([])` while there are none, so the section is absent from spaces that don't use the plugin. Its `+` action goes with it, so the type also needs a `SpaceCapabilities.CreateObjectEntry` (`src/capabilities/create-object.ts`) for the first create.

**Create where the objects are listed, not in the database** — `SpaceOperation.AddObject` navigates to `targetNodeId`, falling back to the database subtree when absent, so forwarding a bare `options.targetNodeId` strands the user under Database. Point it at the node whose children are the objects: the section, or its object-listing child when the hub nests one (plugin-studio's Artifacts hang off a virtual `Artifacts` node, not the Studio section):

```ts
targetNodeId: options.targetNodeId ?? getPublicationsPath(options.db.spaceId),
```

Declare paths once in `src/paths.ts` — `GraphPath.getSpacePath(spaceId, GroupSegments.<group>, <segment>)`, or `GraphPath.createTypeSectionPaths(Type, { groupId })` — and import them from both the graph builder and the create-object entries.

See: `plugin-inbox/src/capabilities/app-graph-builder.ts`, `plugin-inbox/src/paths.ts`

## Plugin Definition

The main plugin file wires everything together with `Plugin.define(meta).pipe(Plugin.addModule(...))`.
Modules come from **makers** in `AppCapability` (loader-based) or `Capability.lazyModule` /
`Capability.inlineModule` (for anything without a maker). See `plugin-chess/src/ChessPlugin.tsx`.

| Maker                                                                         | Contributes                 | Default wave                                         |
| ----------------------------------------------------------------------------- | --------------------------- | ---------------------------------------------------- |
| `AppCapability.surface`                                                       | React surfaces              | demand — `SurfacesRequested(role)` per declared role |
| `AppCapability.reactContext`                                                  | React context provider      | **Startup** (mandatory — see below)                  |
| `AppCapability.reactRoot`                                                     | React root                  | **Startup**                                          |
| `AppCapability.settings`                                                      | Plugin settings             | **Startup**                                          |
| `AppCapability.operationHandler`                                              | Operation handlers          | **Startup**                                          |
| `AppCapability.navigationResolver`                                            | Navigation target resolvers | **Startup**                                          |
| `AppCapability.navigationHandler`                                             | Navigation handlers         | **Startup**                                          |
| `AppCapability.layerSpec`                                                     | Effect layer specs          | **Startup** (restart-scoped)                         |
| `AppCapability.commands`                                                      | CLI commands                | **Startup**                                          |
| `AppCapability.appGraphBuilder`                                               | Graph builder extensions    | `Idle`                                               |
| `AppCapability.skillDefinition`                                               | AI skills                   | the assistant's start event                          |
| `AppCapability.schema`                                                        | ECHO type registration      | idle (ungated)                                       |
| `AppCapability.translations`                                                  | i18n resources              | idle (ungated)                                       |
| `AppCapability.undoMappings` / `commentConfig` / `textContent` / `anchorSort` | as named                    | idle (ungated)                                       |

### Activation waves

**Omitting `activatesOn` means idle, not startup.** An ungated module runs in the idle wave after
the app is interactive, and is pullable earlier as a dependency. That is the right default for
almost everything; the exceptions are listed above and are baked into the makers.

Five rules, each learned from a shipped regression:

1. **Use the maker.** A module that builds its spec by hand (`Capability.lazyModule({ provides:
[Capabilities.ReactContext] })`) bypasses the maker's gate and silently inherits the idle
   default. A React context arriving at idle leaves roots already mounted _outside_ it — Radix
   reports `Tooltip.Trigger must be used within Tooltip`.
2. **The gate belongs on the PROVIDER, not the reader.** If a Startup module reads state on its
   first render, gate the _state module_ `activatesOn: ActivationEvents.Startup`. Declaring it as
   the reader's `requires` does the opposite of what it looks like: `requires` only pulls a
   provider forward when the provider is ungated, so pointing it at an idle-gated provider demotes
   the **reader** into the idle wave. Measured: the deck shell went blank for 6.3 s that way.
3. **Headless state is not gated on its plugin's UI.** Comment sync, compute graphs and filesystem
   state work in a markdown document with no review/sheet/filesystem surface ever rendered. Gating
   them on `<Plugin>Events.Start` conflates "the UI is on screen" with "the state exists"; leave
   them ungated and let consumers `requires` them.
4. **Cross-plugin contributions ride the CONSUMING plugin's start event** — a skill rides the
   assistant's, a markdown extension rides markdown's — so the contribution costs nothing until its
   host is in use.
5. **Permission-gated APIs wait for a user action.** A prompt raised from `activate` has no
   context to justify it, so the user Blocks it and the block sticks for the whole origin. Covers
   `getUserMedia`, `getDisplayMedia`, notifications, geolocation, clipboard reads,
   `bluetooth`/`usb`/`serial`/`hid`/`midi`, `storage.persist()`, and any `fetch` or `WebSocket` to
   localhost or a LAN address, which raises Chrome's local network prompt with no permission API in
   the code. Such a plugin also stays out of `getDefaults` in every environment.

A plugin's own `<Plugin>Events.Start` fires on demand: the module loader fires it when one of the
plugin's modules contributes a `ReactSurface`. An unvisited feature never starts.

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

## Non-Browser Variants

A plugin that must load outside a DOM (the `dx` CLI, workerd) ships one variant per environment,
selected by the `#plugin` conditions: `src/FooPlugin.tsx` (browser default), `src/FooPlugin.node.ts`,
`src/FooPlugin.workerd.ts`. **Only add a variant the plugin genuinely supports** — a front-end-only
plugin has none, and its `#plugin` collapses to a single resolution (`plugin-deck`, `plugin-navtree`).

**`lazy` defers evaluation, not bundling.** `Capability.lazyModule`, `OperationHandlerSet.lazy` and
`React.lazy` all postpone the import at runtime while a bundler still walks it, so a barrel that
merely _lists_ a React surface pulls React — and the `react-ui` graph behind it — into every
consumer. Runtime laziness never keeps UI out of a node build; a node-conditioned barrel does.

Each variant therefore needs its own barrels, conditioned in `package.json` `imports`:

| Barrel          | Node file                  | Holds                                            |
| --------------- | -------------------------- | ------------------------------------------------ |
| `#capabilities` | `src/capabilities/node.ts` | Only the capabilities `FooPlugin.node` activates |
| `#operations`   | `src/operations/node.ts`   | Only the operations a node host can serve        |

**Re-export through the alias, not a relative path** — `src/plugin.ts` must use
`export { FooOperationHandlerSet } from '#operations';`. A relative `'./operations'` bypasses the
import map, so the node condition never applies and `./plugin` drags the browser set in anyway.

What makes a contribution browser-only:

- A `SpaceCapabilities.CreateObjectEntry` with a `customPanel` — the entry bundles the headless
  object factory with a React component, so `CreateObject` is omitted from the node barrel.
- An operation driving a live editor view or Surface (`scroll-to-anchor`).

TypeScript resolves the `types` condition for every environment, so it always sees the full barrel —
derive the node barrel from what `FooPlugin.node.ts` actually imports so the two agree.

### Headless values in UI packages

Much of what an operation handler needs is headless but lives behind a UI package's root barrel.
Import the UI-free entrypoint instead of relocating the code:

| Need                                               | Import from                      | Not                       |
| -------------------------------------------------- | -------------------------------- | ------------------------- |
| `Attention` / `Selection` / `ViewState`            | `@dxos/react-ui-attention/types` | the package root          |
| `Cursor`, `cherryPickHunk`, `createComment`        | `@dxos/ui-editor/headless`       | the package root          |
| `hues`, `Hue`, `toHue`                             | `@dxos/ui-theme/headless`        | the package root          |
| The `Table` schema                                 | `@dxos/react-ui-table/types`     | the package root          |
| `getSpace`, `ConnectionState`, `InvitationEncoder` | `@dxos/client/*`                 | `@dxos/react-client/*`    |
| `Atom`, `Registry`, `Result`                       | `@effect-atom/atom`              | `@effect-atom/atom-react` |

A package that reads its own files at runtime needs a bundler-friendly entry too: paths computed from
`import.meta.url` land inside the compiled binary's embedded filesystem, where its siblings do not exist.

### Guarding it

`check-module-structure` traces the export and fails if React is reachable. Every plugin with a node
variant has this task, and CI runs `moon run :check-module-structure`. Diagnose a failure by printing
the chain:

```bash
pnpm exec dx-trace-imports --export ./plugin --to "{react,react-dom}" \
  --conditions workerd,worker,node --max-chains 2
```

See: `plugin-map/src/capabilities/node.ts`, `plugin-sheet/src/operations/node.ts`,
`plugin-client/package.json` (conditioned `#capabilities`), `plugin-map/moon.yml`

## React Surface

Surfaces are contributed via `Capability.contribute(Capabilities.ReactSurface, [...])` with `Surface.create()`.
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
- A plugin with a node or workerd variant gives `#plugin`, `#capabilities` and (when needed)
  `#operations` a per-condition map — `source` for the TS paths plus the built `node`/`workerd`
  entries. See **Non-Browser Variants**.
- Internal `@dxos` deps use `workspace:*`; external deps use `catalog:`.

See: `plugin-chess/package.json`

## moon.yml

Each `package.json` export subpath needs a matching `--entryPoint` in the `compile` task args
(vite-built plugins: a matching `entry` in `vite.config.ts`, including `capabilities/node`).
A plugin with a node variant also carries a `check-module-structure` task — see
**Non-Browser Variants**.

See: `plugin-chess/moon.yml`

## Coding Style

- Use `invariant` over throwing errors to assert function preconditions.
- Use barrel imports (`#components`, `#containers`, etc.) instead of deep relative paths.
- Avoid default exports in `src/components/`. The only default exports are in container `index.ts` files (for `React.lazy`).
- Container-to-container imports use the default import: `import X from '../X';`.
- Use `Panel.Root` with `role` prop in container article/section components.
- All ECHO interfaces must be reactive. Use `useQuery`, `useObject`, atoms, etc. — patterns and
  anti-patterns in the [reactivity](../reactivity/SKILL.md) skill.
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
- Never rely on `Capability.lazyModule` / `OperationHandlerSet.lazy` / `React.lazy` to keep a dependency
  out of a bundle — they defer evaluation, not bundling. See **Non-Browser Variants**.
- The `Surface` component provides top-level `<Suspense>` for lazy containers; individual containers only need their own Suspense if they use `React.use()` or render lazy sub-components.
