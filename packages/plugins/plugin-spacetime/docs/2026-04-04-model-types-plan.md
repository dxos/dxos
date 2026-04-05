# Spacetime Model Types Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create ECHO types for `Model.Object` so scenes persist geometry, and wire the canvas to render objects from the scene.

**Architecture:** `Scene.Scene` holds a `Ref.Ref` array of `Model.Object` items. Each `Model.Object` stores its primitive type and transform. When a scene is created, a default cube `Model.Object` is added. The canvas reads the scene's objects and renders them via Manifold→Babylon.

**Tech Stack:** Effect Schema, `@dxos/echo` (Obj, Ref, Type, Annotation), Manifold, Babylon.js

---

## File Structure

| File                                                   | Action | Responsibility                                                                       |
| ------------------------------------------------------ | ------ | ------------------------------------------------------------------------------------ |
| `src/types/Model.ts`                                   | Create | `Model.Object` ECHO type with primitive, position, scale, rotation                   |
| `src/types/Scene.ts`                                   | Modify | Add `objects: Ref.Ref(Model.Object)[]` field, update `make()` to create default cube |
| `src/types/index.ts`                                   | Modify | Add `Model` namespace export                                                         |
| `src/SpacetimePlugin.tsx`                              | Modify | Register `Model.Object` in schema module                                             |
| `src/translations.ts`                                  | Modify | Add `Model.Object` translations                                                      |
| `src/components/SpacetimeEditor/SpacetimeEditor.tsx`   | Modify | Pass scene to context                                                                |
| `src/containers/SpacetimeArticle/SpacetimeArticle.tsx` | Modify | Pass scene subject to editor root                                                    |
| `src/components/SpacetimeCanvas/SpacetimeCanvas.tsx`   | Modify | Read objects from scene, render each as Babylon mesh                                 |

---

### Task 1: Create `Model.Object` ECHO type

**Files:**

- Create: `src/types/Model.ts`

- [ ] **Step 1: Create Model.ts with Object schema**

```typescript
// src/types/Model.ts
//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, Obj, Type } from '@dxos/echo';
import { FormInputAnnotation } from '@dxos/echo/internal';

/**
 * Primitive geometry type for a model object.
 */
export const PrimitiveType = Schema.Literal('cube', 'sphere', 'cylinder', 'torus');
export type PrimitiveType = Schema.Schema.Type<typeof PrimitiveType>;

/**
 * 3D vector stored as three numbers.
 */
const Vec3 = Schema.Struct({
  x: Schema.Number,
  y: Schema.Number,
  z: Schema.Number,
});

/**
 * A solid object within a scene.
 */
export const Object = Schema.Struct({
  label: Schema.optional(Schema.String),
  primitive: PrimitiveType,
  position: Vec3.pipe(FormInputAnnotation.set(false)),
  scale: Vec3.pipe(FormInputAnnotation.set(false)),
  rotation: Vec3.pipe(FormInputAnnotation.set(false)),
  color: Schema.optional(Schema.String),
}).pipe(
  Type.object({
    typename: 'org.dxos.type.spacetime.object',
    version: '0.1.0',
  }),
  Annotation.IconAnnotation.set({
    icon: 'ph--cube--regular',
    hue: 'teal',
  }),
);

export type Object = Schema.Schema.Type<typeof Object>;

export const make = (props?: Partial<Omit<Object, 'primitive'>> & { primitive?: PrimitiveType }): Object =>
  Obj.make(Object, {
    primitive: 'cube',
    position: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    rotation: { x: 0, y: 0, z: 0 },
    ...props,
  });
```

- [ ] **Step 2: Build and verify**

Run: `moon run plugin-spacetime:build --force`
Expected: Clean build (250 tasks completed)

- [ ] **Step 3: Commit**

```bash
git add src/types/Model.ts
git commit -m "feat(plugin-spacetime): add Model.Object ECHO type"
```

---

### Task 2: Update Scene to reference Model objects

**Files:**

- Modify: `src/types/Scene.ts`
- Modify: `src/types/index.ts`

- [ ] **Step 1: Update Scene.ts to import Model and add objects array**

Replace Scene.ts contents with:

```typescript
//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Annotation, Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation } from '@dxos/echo/internal';

import { Object as ModelObject, make as makeObject } from './Model';

export namespace Spacetime {
  export const Scene = Schema.Struct({
    name: Schema.optional(Schema.String),
    objects: Ref.Ref(ModelObject).pipe(Schema.Array, FormInputAnnotation.set(false)),
  }).pipe(
    Type.object({
      typename: 'org.dxos.type.Scene.Scene',
      version: '0.1.0',
    }),
    Annotation.IconAnnotation.set({
      icon: 'ph--cube--regular',
      hue: 'teal',
    }),
  );

  export type Scene = Schema.Schema.Type<typeof Scene>;

  /** Creates a new scene with a default cube object. */
  export const make = (props?: Partial<Omit<Scene, 'objects'>>) => {
    const defaultCube = makeObject({ primitive: 'cube' });
    const scene = Obj.make(Scene, {
      objects: [Ref.make(defaultCube)],
      ...props,
    });
    Obj.setParent(defaultCube, scene);
    return scene;
  };
}
```

- [ ] **Step 2: Update index.ts to export Model namespace**

```typescript
//
// Copyright 2026 DXOS.org
//

export * from './capabilities';
export * from './Scene';
export * as Model from './Model';
export * as Settings from './Settings';
```

- [ ] **Step 3: Build and verify**

Run: `moon run plugin-spacetime:build --force`
Expected: Clean build

- [ ] **Step 4: Commit**

```bash
git add src/types/Scene.ts src/types/index.ts
git commit -m "feat(plugin-spacetime): add objects array to Scene, export Model namespace"
```

---

### Task 3: Register Model.Object schema and update translations

**Files:**

- Modify: `src/SpacetimePlugin.tsx`
- Modify: `src/translations.ts`

- [ ] **Step 1: Register Model.Object in schema module**

In `SpacetimePlugin.tsx`, add Model import and register the schema:

```typescript
import { Spacetime, Model } from './types';
```

Change the schema line:

```typescript
AppPlugin.addSchemaModule({ schema: [Scene.Scene, Model.Object] }),
```

- [ ] **Step 2: Add Model.Object translations**

In `translations.ts`, add a Model.Object section after the Scene translations:

```typescript
[Model.Object.typename]: {
  'typename.label': 'Object',
  'typename.label_zero': 'Objects',
  'typename.label_one': 'Object',
  'typename.label_other': 'Objects',
},
```

Update the import to include `Model`:

```typescript
import { Spacetime, Model } from './types';
```

- [ ] **Step 3: Build and verify**

Run: `moon run plugin-spacetime:build --force`
Expected: Clean build

- [ ] **Step 4: Commit**

```bash
git add src/SpacetimePlugin.tsx src/translations.ts
git commit -m "feat(plugin-spacetime): register Model.Object schema and translations"
```

---

### Task 4: Wire scene subject into SpacetimeEditor context

**Files:**

- Modify: `src/components/SpacetimeEditor/SpacetimeEditor.tsx`
- Modify: `src/containers/SpacetimeArticle/SpacetimeArticle.tsx`

- [ ] **Step 1: Add scene to SpacetimeEditor context**

In `SpacetimeEditor.tsx`, add `scene` to the context value type:

```typescript
import { type Spacetime } from '../../types';
```

Add to `SpacetimeEditorContextValue`:

```typescript
type SpacetimeEditorContextValue = {
  scene?: Scene.Scene;
  tool: SpacetimeTool;
  onToolChange: (tool: SpacetimeTool) => void;
};
```

Add `scene` prop to `SpacetimeEditorRootProps`:

```typescript
type SpacetimeEditorRootProps = PropsWithChildren<{
  scene?: Scene.Scene;
}>;
```

Pass `scene` through the provider in `SpacetimeEditorRoot`.

- [ ] **Step 2: Pass scene from SpacetimeArticle**

In `SpacetimeArticle.tsx`, destructure `subject` and pass to root:

```typescript
export const SpacetimeArticle = ({ role, subject, settings }: SpacetimeArticleProps) => {
  return (
    <SpacetimeEditor.Root scene={subject}>
      ...
    </SpacetimeEditor.Root>
  );
};
```

- [ ] **Step 3: Build and verify**

Run: `moon run plugin-spacetime:build --force`
Expected: Clean build

- [ ] **Step 4: Commit**

```bash
git add src/components/SpacetimeEditor/SpacetimeEditor.tsx src/containers/SpacetimeArticle/SpacetimeArticle.tsx
git commit -m "feat(plugin-spacetime): wire scene subject into editor context"
```

---

### Task 5: Render scene objects in SpacetimeCanvas

**Files:**

- Modify: `src/components/SpacetimeCanvas/SpacetimeCanvas.tsx`

This is the most complex task. The canvas currently creates a hardcoded cube. It needs to read `scene.objects` and render each one.

- [ ] **Step 1: Add scene prop to SpacetimeCanvas**

Add `scene` to `SpacetimeCanvasProps`:

```typescript
import { type Spacetime, type Model } from '../../types';

export type SpacetimeCanvasProps = {
  scene?: Scene.Scene;
  showAxes?: boolean;
  showFps?: boolean;
};
```

- [ ] **Step 2: Create helper to build Manifold solid from Model.Object**

Add a function that maps `Model.Object.primitive` to a Manifold solid:

```typescript
const createSolidFromObject = (Manifold: Awaited<ReturnType<typeof getManifold>>['Manifold'], obj: Model.Object) => {
  const size = [obj.scale.x * 2, obj.scale.y * 2, obj.scale.z * 2] as [number, number, number];
  let solid;
  switch (obj.primitive) {
    case 'sphere':
      solid = Manifold.sphere(size[0] / 2, 24);
      break;
    case 'cylinder':
      solid = Manifold.cylinder(size[1], size[0] / 2, size[0] / 2, 24);
      break;
    case 'torus':
      // Approximate torus as a cylinder for now.
      solid = Manifold.cylinder(size[1] * 0.5, size[0] / 2, size[0] / 2, 24);
      break;
    case 'cube':
    default:
      solid = Manifold.cube(size, true);
      break;
  }
  const translated = solid.translate([obj.position.x, obj.position.y, obj.position.z]);
  solid.delete();
  return translated;
};
```

- [ ] **Step 3: Replace hardcoded cube with scene-driven rendering**

Replace the initialization effect that creates a single cube with one that iterates `scene.objects`, creates a Manifold solid per object, converts to Babylon mesh, and tracks meshes by object id.

Key changes:

- Store meshes in a `Map<string, Mesh>` ref keyed by object id.
- On scene change, diff meshes: add new, remove deleted, update changed.
- For the storybook (no scene prop), fall back to the existing hardcoded cube.

- [ ] **Step 4: Update SpacetimeEditorCanvas to pass scene**

In `SpacetimeEditor.tsx`, update the Canvas sub-component to pass `scene` from context:

```typescript
const SpacetimeEditorCanvas = composable<HTMLDivElement, SpacetimeEditorCanvasProps>((props, forwardedRef) => {
  const { scene } = useSpacetimeEditorContext(SPACETIME_EDITOR_CANVAS);
  return <SpacetimeCanvas {...composableProps(props)} scene={scene} ref={forwardedRef} />;
});
```

- [ ] **Step 5: Build and verify**

Run: `moon run plugin-spacetime:build --force`
Expected: Clean build

- [ ] **Step 6: Commit**

```bash
git add src/components/SpacetimeCanvas/SpacetimeCanvas.tsx src/components/SpacetimeEditor/SpacetimeEditor.tsx
git commit -m "feat(plugin-spacetime): render scene objects in canvas"
```

---

### Task 6: Update SPEC.md to mark completed tasks

**Files:**

- Modify: `SPEC.md`

- [ ] **Step 1: Mark Phase 1 type tasks as complete**

```markdown
- [x] Create ECHO types for: `Scene.Scene`, `Model.Object`, and `Settings.Settings` (in `./types`);
  - [x] SpacetimeArticle should be bound to a `Scene.Scene` object; when creating a Scene from composer it should create a default cube.
  - [x] `Scene.Scene` should contain a map of `Model.Object` objects.
```

- [ ] **Step 2: Commit**

```bash
git add SPEC.md
git commit -m "docs(plugin-spacetime): mark model types tasks as complete"
```
