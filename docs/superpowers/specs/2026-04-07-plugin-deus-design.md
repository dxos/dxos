# plugin-deus Design

**Date:** 2026-04-07

## Overview

A new DXOS plugin that defines a `Spec` type containing a `Text` object and renders it via a `SpecArticle` container using the `react-ui-editor` `Editor` component.

## Package

- **Name:** `@dxos/plugin-deus`
- **Location:** `packages/plugins/plugin-deus`
- **Private:** `true` (required for all new packages)

## Type: `Spec`

Defined in `src/types/Spec.ts` using Effect Schema + `Type.object()`.

```ts
Spec {
  name?: string
  content: Ref<Text.Text>   // from @dxos/schema
}
typename: 'org.dxos.plugin.deus.spec'
version: '0.1.0'
```

- `Spec.make({ name?, content? })` creates an inline `Text.Text` object and wraps it in a `Ref.make`.
- `Obj.setParent(spec.content.target!, spec)` called after creation (same pattern as `plugin-markdown`).
- `isSpec(object)` guard using `Schema.is(Spec)`.

## Container: `SpecArticle`

Defined in `src/containers/SpecArticle/SpecArticle.tsx`.

- Props: `ObjectSurfaceProps<Spec>` (role, subject, attendableId)
- Reads live content string via `useObject(spec.content, 'content')`
- Renders: `Editor.Root` wrapping `Panel.Root` → `Panel.Content` → `Editor.Content`
- `initialValue` set from the resolved content string
- Read-write only (no role-based mode switching)

## Capability: `ReactSurface`

Defined in `src/capabilities/react-surface.tsx`.

- Registers a single `Surface.create` for role `'article'`
- Filter: `isSpec(data.subject) && typeof data.attendableId === 'string'`
- Renders `<SpecArticle role={role} subject={subject} attendableId={attendableId} />`

## Plugin: `DeusPlugin`

Defined in `src/DeusPlugin.tsx` using `Plugin.define(meta).pipe(...)`.

Modules:

1. `addMetadataModule` — icon, createObject via `SpaceOperation.AddObject`
2. `addSchemaModule` — registers `[Spec]`
3. `addSurfaceModule` — `ReactSurface` capability
4. `addTranslationsModule`

## File Structure

```text
packages/plugins/plugin-deus/
  src/
    capabilities/
      index.ts
      react-surface.tsx
    containers/
      index.ts
      SpecArticle/
        index.ts
        SpecArticle.tsx
    types/
      index.ts
      Spec.ts
    index.ts
    DeusPlugin.tsx
    meta.ts
    translations.ts
  package.json
  moon.yml
  tsconfig.json
```

## Dependencies

Runtime (workspace):

- `@dxos/app-framework`
- `@dxos/app-toolkit`
- `@dxos/echo`
- `@dxos/operation`
- `@dxos/plugin-space`
- `@dxos/react-client`
- `@dxos/react-ui`
- `@dxos/react-ui-editor`
- `@dxos/schema`

Catalog:

- `effect`

Dev/peer:

- `@dxos/ui-theme`, `react`, `react-dom`, `@types/react`, `vite`
