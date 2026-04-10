# plugin-exemplar Guide

A reference plugin demonstrating every common DXOS plugin pattern. Each source file contains inline comments explaining the "why" behind each pattern.

## Composer's Three Pillars

Composer is built on three systems that plugins participate in:

1. **Operations** — The compute layer. Operations define what can happen in the application — creating objects, updating state, triggering workflows. They are typed, decoupled from UI, and invocable by other plugins and AI assistants. See [Operations API](../../../sdk/app-toolkit/docs/operations-api.md).

2. **Surfaces** — The rendering layer. Surfaces connect graph nodes to React components through a role-based matching system. The layout decides which roles to render, and each plugin declares which components handle which data. See [Surfaces API](../../../sdk/app-toolkit/docs/surfaces-api.md).

3. **App Graph** — The structure layer. The app graph drives the entire layout of the application — the navigation tree, object actions, companion panels, and keyboard shortcuts. The ontology of the application is encoded into graph builder extensions, which compose across plugins to define what exists, how it's organized, and what you can do with it. See [Graph Builder API](../../../sdk/app-toolkit/docs/graph-builder-api.md).

Everything else in a plugin builds on or around these three systems.

## Plugin Anatomy

Every plugin has two critical files:

- [`src/meta.ts`](../src/meta.ts) — Plugin identity: unique ID, display name, icon, and description.
- [`src/ExemplarPlugin.ts`](../src/ExemplarPlugin.ts) — Plugin definition using `Plugin.define(meta).pipe(...)`. Each `.pipe()` call registers a capability module that activates at the appropriate lifecycle event.

The plugin definition chains these registration helpers:

| Helper                      | What it registers                                  | Activation event        |
| --------------------------- | -------------------------------------------------- | ----------------------- |
| `addOperationHandlerModule` | Operation handlers                                 | `SetupOperationHandler` |
| `addSurfaceModule`          | React surface contributions                        | `SetupReactSurface`     |
| `addAppGraphModule`         | Graph extensions (actions, connectors, companions) | `SetupAppGraph`         |
| `addMetadataModule`         | Type metadata (icon, createObject factory)         | `SetupMetadata`         |
| `addSchemaModule`           | ECHO schemas                                       | `SetupSchema`           |
| `addSettingsModule`         | Plugin settings                                    | `SetupSettings`         |
| `addTranslationsModule`     | i18n translations                                  | `SetupTranslations`     |

## Operations

See [Operations API](../../../sdk/app-toolkit/docs/operations-api.md) for more detail on the operation system.

- [`src/operations/definitions.ts`](../src/operations/definitions.ts) — Operation contracts with `Operation.make()`.
- [`src/operations/create-exemplar-item.ts`](../src/operations/create-exemplar-item.ts) — Handler using `Operation.withHandler()`.
- [`src/operations/update-status.ts`](../src/operations/update-status.ts) — Handler that mutates an ECHO object via `Obj.change()`.
- [`src/operations/index.ts`](../src/operations/index.ts) — Lazy handler registration with `OperationHandlerSet.lazy()`.

## Surfaces

See [Surfaces API](../../../sdk/app-toolkit/docs/surfaces-api.md) for more detail on the surface system.

[`src/capabilities/react-surface.tsx`](../src/capabilities/react-surface.tsx) registers six surfaces:

| Surface          | Role                             | Filter                                                           | Component                 |
| ---------------- | -------------------------------- | ---------------------------------------------------------------- | ------------------------- |
| Article          | `article`, `section`             | `objectArticle(ExemplarItem)`                                    | `ExemplarArticle`         |
| Object settings  | `object-settings`                | `objectSettings(ExemplarItem)`                                   | `ExemplarObjectSettings`  |
| Plugin settings  | `article`                        | `settingsArticle(meta.id)`                                       | `ExemplarSettings`        |
| Status indicator | `status-indicator`               | _(none)_                                                         | `ExemplarStatusIndicator` |
| Companion        | `article`                        | `and(literalArticle('related'), companionArticle(ExemplarItem))` | `ExemplarCompanionPanel`  |
| Deck companion   | `deck-companion--exemplar-panel` | `literalSection('exemplar-panel')`                               | `ExemplarDeckCompanion`   |

## App Graph

See [Graph Builder API](../../../sdk/app-toolkit/docs/graph-builder-api.md) for more detail on the graph system.

[`src/capabilities/app-graph-builder.ts`](../src/capabilities/app-graph-builder.ts) demonstrates six extension patterns:

1. **Root-level action** — `NodeMatcher.whenRoot` + `actions` adds a "Create Exemplar Item" action to the global menu.
2. **Sub-graph section** — `whenSpace` matcher + `connector` creates an "Exemplars" section under each space.
3. **Section children** — Custom matcher for the section type + `connector` populates ExemplarItem objects as child nodes.
4. **Type-specific action** — `createTypeExtension` + `actions` adds an "Archive" action to ExemplarItem nodes.
5. **Plank companion** — `createTypeExtension` + `connector` attaches a "Related" side panel to ExemplarItem objects.
6. **Deck companion** — `createExtension` + `NodeMatcher.whenRoot` + `connector` adds a workspace-wide panel.

## Schema Types

[`src/types/ExemplarItem.ts`](../src/types/ExemplarItem.ts) — Defines an ECHO schema using Effect/Schema with annotations:

- `Type.object()` — Registers the typename for ECHO storage.
- `LabelAnnotation` — Framework uses this for display labels.
- `IconAnnotation` — Sets the icon/color in the navigation tree.
- `Obj.make()` — Factory for creating reactive ECHO objects.

[`src/types/Settings.ts`](../src/types/Settings.ts) — Settings schema using `Schema.mutable` (required for writable atoms).

[`src/types/index.ts`](../src/types/index.ts) — Barrel exports as namespaces, plus plugin-specific capabilities.

## Settings

- [`src/types/Settings.ts`](../src/types/Settings.ts) — Schema definition.
- [`src/capabilities/settings.ts`](../src/capabilities/settings.ts) — Creates a persistent `createKvsStore` atom and contributes it both locally (`ExemplarCapabilities.Settings`) and globally (`AppCapabilities.Settings`).

## Companions

**Plank companions** are side panels attached to specific objects. Registered in the graph builder via `AppNode.makeCompanion()` and rendered via a companion article surface.

**Deck companions** are workspace-wide panels. Registered via `AppNode.makeDeckCompanion()` and rendered via a `deck-companion--{id}` surface role.

See [`src/capabilities/app-graph-builder.ts`](../src/capabilities/app-graph-builder.ts) for the graph registration and [`src/capabilities/react-surface.tsx`](../src/capabilities/react-surface.tsx) for the surface rendering.

## Status Bar

[`src/containers/ExemplarStatusIndicator.tsx`](../src/containers/ExemplarStatusIndicator.tsx) — Uses `StatusBar.Item` from `@dxos/plugin-status-bar` to contribute an icon to the application status bar. Rendered via the `status-indicator` surface role.

## Translations

[`src/translations.ts`](../src/translations.ts) — i18next translations organized in two namespaces:

1. `Type.getTypename(Schema)` — Framework-consumed labels for object creation/deletion dialogs.
2. `meta.id` — Plugin-specific labels for actions, companions, and settings.

## Container Lazy Loading

[`src/containers/index.ts`](../src/containers/index.ts) — Uses `React.lazy()` for code-splitting. Each container file `export default`s a component, and the barrel wraps it with `lazy()`.

## Capabilities

[`src/capabilities/index.ts`](../src/capabilities/index.ts) — Uses `Capability.lazy()` to defer module loading until activation. This enables code-splitting at the capability level.
