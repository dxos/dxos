---
name: composer-plugins
description: Use when working on files in packages/plugins/, adding new plugins,
  refactoring plugin components/containers, writing storybooks for plugins,
  or wiring capabilities like react-surface or operation-resolver.
---

# Composer Plugins

Exemplar: `packages/plugins/plugin-chess`. Read its source files to understand every pattern below.

## Specification

Each plugin should have a `PLUGIN.mdl` specification written in the MDL language defined by `plugin-spec` (see `packages/plugins/plugin-spec/docs/` and `src/extension/mdl.grammar` for syntax).

The specification is the source of truth for what the plugin does. It must be:

- **Created early** — draft the spec before or alongside initial implementation.
- **Kept up-to-date** — when features are discussed, added, or changed, update the spec first.
- **Used for testing** — derive user feature tests and acceptance criteria from the spec's `feat`, `req`, and `test` blocks.

When the user discusses new features or changes, update `PLUGIN.mdl` to reflect the agreed requirements before implementing. Tests should verify the behaviors described in the spec.

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

Build and lint the skeleton before adding features. Add capabilities incrementally as needed (operations, blueprints, settings, etc.).

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

See: `plugin-chess/src/components/Chessboard/`

### Container (`src/containers/`)

High-level surface component. Uses capabilities and is referenced by `react-surface`.
Each container lives in its own subdirectory. The subdirectory `index.ts` bridges named to default export (for `React.lazy`).
The top-level `containers/index.ts` uses `lazy(() => import('./X'))` with `: ComponentType<any>` annotation.
Surface components use suffixes matching their role: `Article`, `Card`, `Dialog`, `Popover`, `Settings`.
Containers should NOT use custom classNames/styles (except functional TailwindCSS like `@container`).
Create a basic storybook for each.

See: `plugin-chess/src/containers/ChessArticle/`, `plugin-chess/src/containers/index.ts`

### Capability (`src/capabilities/`)

Plugin modules that contribute functionality to the framework. Each is a single file with a default export using `Capability.makeModule()`. The barrel `index.ts` uses only `Capability.lazy()` exports. Do NOT add non-lazy exports.

See: `plugin-chess/src/capabilities/`

### Schema (`src/types/`)

ECHO type definitions using Effect Schema with `Type.object()`, `LabelAnnotation`, and `Annotation.IconAnnotation`. Use namespace re-exports (e.g., `export * as Chess from './Chess'`). Include a `make()` factory function using `Obj.make()`.

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
Common roles: `article`, `section`, `card--content`, `object-settings`, `form-input`, `dialog`.
Common filters: `AppSurface.objectArticle(Type)`, `AppSurface.objectCard(Type)`, `AppSurface.objectSettings(Type)`.

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
