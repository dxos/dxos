# Plugin Spacetime Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create plugin-spacetime — a 3D modeling plugin using Babylon.js for rendering and Manifold (manifold-3d) for solid geometry operations, with a storybook-driven experiment featuring cube extrusion.

**Architecture:** Plugin follows the DXOS plugin-template scaffold pattern. Babylon.js renders via a canvas ref managed by React hooks. Manifold provides the geometry kernel (CSG operations, extrusion). The 3D editor component manages scene interaction (orbit, face picking, extrusion) and converts Manifold mesh output to Babylon.js vertex data.

**Tech Stack:** Babylon.js (@babylonjs/core), Manifold (manifold-3d), Effect Schema, React, DXOS app-framework

---

## File Structure

```
packages/plugins/plugin-spacetime/
├── package.json
├── moon.yml
├── tsconfig.json
├── src/
│   ├── index.ts                           # Public exports
│   ├── meta.ts                            # Plugin metadata
│   ├── translations.ts                    # i18n strings
│   ├── SpacetimePlugin.tsx                # Main plugin definition
│   ├── types/
│   │   ├── index.ts                       # Barrel export
│   │   └── schema.ts                      # ECHO schema (Scene.Scene)
│   ├── capabilities/
│   │   ├── index.ts                       # Barrel export
│   │   └── react-surface/
│   │       ├── index.ts                   # Lazy capability export
│   │       └── react-surface.tsx          # Surface registration
│   ├── engine/
│   │   ├── index.ts                       # Barrel export
│   │   ├── manifold-context.ts            # Manifold WASM singleton loader
│   │   ├── mesh-converter.ts              # Manifold mesh → Babylon.js mesh
│   │   └── scene-manager.ts               # Babylon.js engine/scene lifecycle
│   ├── components/
│   │   ├── index.ts                       # Barrel export
│   │   └── SpacetimeEditor/
│   │       ├── index.ts                   # Component export
│   │       ├── SpacetimeEditor.tsx         # Main 3D editor component
│   │       └── SpacetimeEditor.stories.tsx # Storybook stories
│   └── containers/
│       ├── index.ts                       # Lazy container export
│       └── SpacetimeArticle/
│           ├── index.ts                   # Default export bridge
│           ├── SpacetimeArticle.tsx        # Container with ECHO integration
│           └── SpacetimeArticle.stories.tsx
```

---

### Task 1: Add Babylon.js and Manifold dependencies to pnpm catalog

**Files:**

- Modify: `pnpm-workspace.yaml` (catalog section)

- [ ] **Step 1: Add @babylonjs/core and manifold-3d to catalog**

Add the following entries to the `catalog:` section of `pnpm-workspace.yaml`, maintaining alphabetical order:

```yaml
'@babylonjs/core': ^7.52.5
'manifold-3d': ^3.0.0
```

Find the correct alphabetical positions — `@babylonjs/core` goes near the top after `@ariakit/*` entries, and `manifold-3d` goes after `leva`.

- [ ] **Step 2: Run pnpm install to verify catalog entries**

Run: `pnpm install`
Expected: Clean install with no errors about missing packages.

- [ ] **Step 3: Commit**

```bash
git add pnpm-workspace.yaml pnpm-lock.yaml
git commit -m "feat(plugin-spacetime): add babylonjs and manifold-3d to pnpm catalog"
```

---

### Task 2: Scaffold plugin-spacetime package

**Files:**

- Create: `packages/plugins/plugin-spacetime/package.json`
- Create: `packages/plugins/plugin-spacetime/moon.yml`
- Create: `packages/plugins/plugin-spacetime/tsconfig.json`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "@dxos/plugin-spacetime",
  "version": "0.8.3",
  "private": true,
  "description": "3D modeling plugin with Babylon.js and Manifold",
  "homepage": "https://dxos.org",
  "bugs": "https://github.com/dxos/dxos/issues",
  "repository": {
    "type": "git",
    "url": "https://github.com/dxos/dxos"
  },
  "license": "MIT",
  "author": "DXOS.org",
  "sideEffects": true,
  "type": "module",
  "exports": {
    ".": {
      "source": "./src/index.ts",
      "types": "./dist/types/src/index.d.ts",
      "browser": "./dist/lib/browser/index.mjs"
    },
    "./types": {
      "source": "./src/types/index.ts",
      "types": "./dist/types/src/types/index.d.ts",
      "browser": "./dist/lib/browser/types/index.mjs"
    }
  },
  "types": "dist/types/src/index.d.ts",
  "typesVersions": {
    "*": {
      "types": ["dist/types/src/types/index.d.ts"]
    }
  },
  "files": ["dist", "src"],
  "dependencies": {
    "@babylonjs/core": "catalog:",
    "@dxos/app-framework": "workspace:*",
    "@dxos/app-toolkit": "workspace:*",
    "@dxos/echo": "workspace:*",
    "@dxos/operation": "workspace:*",
    "@dxos/plugin-space": "workspace:*",
    "@dxos/util": "workspace:*",
    "effect": "catalog:",
    "manifold-3d": "catalog:"
  },
  "devDependencies": {
    "@dxos/react-ui": "workspace:*",
    "@dxos/storybook-utils": "workspace:*",
    "@dxos/ui-theme": "workspace:*",
    "@types/react": "catalog:",
    "@types/react-dom": "catalog:",
    "react": "catalog:",
    "react-dom": "catalog:",
    "vite": "catalog:"
  },
  "peerDependencies": {
    "@dxos/react-ui": "workspace:*",
    "@dxos/ui-theme": "workspace:*",
    "effect": "catalog:",
    "react": "catalog:",
    "react-dom": "catalog:"
  }
}
```

- [ ] **Step 2: Create moon.yml**

```yaml
layer: library
language: typescript
tags:
  - ts-build
  - ts-test-storybook
  - pack
  - storybook
tasks:
  compile:
    args:
      - '--entryPoint=src/index.ts'
      - '--entryPoint=src/types/index.ts'
      - '--platform=browser'
```

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "extends": ["../../../tsconfig.base.json"],
  "compilerOptions": {
    "types": ["node"]
  },
  "exclude": ["*.t.ts", "vite.config.ts"],
  "include": ["src/**/*.ts", "src/**/*.tsx", "src/*.ts"],
  "references": [
    {
      "path": "../../common/util"
    },
    {
      "path": "../../common/storybook-utils"
    },
    {
      "path": "../../core/echo/echo"
    },
    {
      "path": "../../core/operation"
    },
    {
      "path": "../../sdk/app-framework"
    },
    {
      "path": "../../sdk/app-toolkit"
    },
    {
      "path": "../../ui/react-ui"
    },
    {
      "path": "../../ui/ui-theme"
    },
    {
      "path": "../plugin-space"
    }
  ]
}
```

- [ ] **Step 4: Run pnpm install**

Run: `pnpm install`
Expected: Clean install, plugin-spacetime recognized as workspace package.

- [ ] **Step 5: Commit**

```bash
git add packages/plugins/plugin-spacetime/
git commit -m "feat(plugin-spacetime): scaffold package with babylonjs and manifold deps"
```

---

### Task 3: Create plugin metadata, types, and translations

**Files:**

- Create: `packages/plugins/plugin-spacetime/src/meta.ts`
- Create: `packages/plugins/plugin-spacetime/src/types/schema.ts`
- Create: `packages/plugins/plugin-spacetime/src/types/index.ts`
- Create: `packages/plugins/plugin-spacetime/src/translations.ts`

- [ ] **Step 1: Create meta.ts**

```typescript
//
// Copyright 2026 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: Plugin.Meta = {
  id: 'org.dxos.plugin.spacetime',
  name: 'Spacetime',
  description: trim`
    Generative 3D modeling and animation plugin.
    Create and manipulate solid geometry with boolean operations, extrusion, and real-time collaboration.
  `,
  icon: 'ph--cube--regular',
  iconHue: 'teal',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-spacetime',
};
```

- [ ] **Step 2: Create types/schema.ts**

```typescript
//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Annotation, Obj, Type } from '@dxos/echo';

export namespace Spacetime {
  export const Scene = Schema.Struct({
    name: Schema.optional(Schema.String),
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

  export const make = (props?: Partial<Scene>) => Obj.make(Scene, props ?? {});
}
```

- [ ] **Step 3: Create types/index.ts**

```typescript
//
// Copyright 2026 DXOS.org
//

export * from './schema';
```

- [ ] **Step 4: Create translations.ts**

```typescript
//
// Copyright 2026 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { meta } from './meta';
import { Spacetime } from './types';

export const translations = [
  {
    'en-US': {
      [Scene.Scene.typename]: {
        'typename.label': 'Scene',
        'typename.label_zero': 'Scenes',
        'typename.label_one': 'Scene',
        'typename.label_other': 'Scenes',
        'object-name.placeholder': 'New scene',
        'add-object.label': 'Add scene',
        'rename-object.label': 'Rename scene',
        'delete-object.label': 'Delete scene',
        'object-deleted.label': 'Scene deleted',
      },
      [meta.id]: {
        'plugin.name': 'Spacetime',
      },
    },
  },
] as const satisfies Resource[];
```

- [ ] **Step 5: Verify files compile**

Run: `cd packages/plugins/plugin-spacetime && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors (or only errors related to files not yet created).

- [ ] **Step 6: Commit**

```bash
git add packages/plugins/plugin-spacetime/src/meta.ts packages/plugins/plugin-spacetime/src/types/ packages/plugins/plugin-spacetime/src/translations.ts
git commit -m "feat(plugin-spacetime): add plugin metadata, ECHO schema, and translations"
```

---

### Task 4: Create the Manifold WASM loader

**Files:**

- Create: `packages/plugins/plugin-spacetime/src/engine/manifold-context.ts`
- Create: `packages/plugins/plugin-spacetime/src/engine/index.ts`

- [ ] **Step 1: Create engine/manifold-context.ts**

This module lazily loads the Manifold WASM module and provides a singleton accessor.

```typescript
//
// Copyright 2026 DXOS.org
//

import type ManifoldModule from 'manifold-3d';

let manifoldInstance: ManifoldModule | null = null;
let loadingPromise: Promise<ManifoldModule> | null = null;

/**
 * Lazily loads and returns the Manifold WASM module singleton.
 */
export const getManifold = async (): Promise<ManifoldModule> => {
  if (manifoldInstance) {
    return manifoldInstance;
  }

  if (!loadingPromise) {
    loadingPromise = (async () => {
      const Module = await import('manifold-3d');
      const wasm = await Module.default();
      manifoldInstance = wasm;
      return wasm;
    })();
  }

  return loadingPromise;
};
```

- [ ] **Step 2: Create engine/index.ts**

```typescript
//
// Copyright 2026 DXOS.org
//

export * from './manifold-context';
export * from './mesh-converter';
export * from './scene-manager';
```

- [ ] **Step 3: Commit**

```bash
git add packages/plugins/plugin-spacetime/src/engine/
git commit -m "feat(plugin-spacetime): add Manifold WASM loader singleton"
```

---

### Task 5: Create the Babylon.js scene manager

**Files:**

- Create: `packages/plugins/plugin-spacetime/src/engine/scene-manager.ts`

- [ ] **Step 1: Create engine/scene-manager.ts**

Manages Babylon.js engine, scene, camera, and lighting lifecycle.

```typescript
//
// Copyright 2026 DXOS.org
//

import { ArcRotateCamera, Engine, HemisphericLight, Scene, Vector3 } from '@babylonjs/core';

export type SceneManagerOptions = {
  canvas: HTMLCanvasElement;
};

/**
 * Manages the Babylon.js engine, scene, camera, and lighting.
 */
export class SceneManager {
  private readonly _engine: Engine;
  private readonly _scene: Scene;
  private readonly _camera: ArcRotateCamera;

  constructor({ canvas }: SceneManagerOptions) {
    this._engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
    this._scene = new Scene(this._engine);

    this._camera = new ArcRotateCamera('camera', -Math.PI / 4, Math.PI / 3, 10, Vector3.Zero(), this._scene);
    this._camera.attachControl(canvas, true);
    this._camera.lowerRadiusLimit = 2;
    this._camera.upperRadiusLimit = 50;
    this._camera.wheelPrecision = 20;

    const light = new HemisphericLight('light', new Vector3(0, 1, 0), this._scene);
    light.intensity = 0.8;

    this._engine.runRenderLoop(() => {
      this._scene.render();
    });
  }

  get engine(): Engine {
    return this._engine;
  }

  get scene(): Scene {
    return this._scene;
  }

  get camera(): ArcRotateCamera {
    return this._camera;
  }

  resize(): void {
    this._engine.resize();
  }

  dispose(): void {
    this._engine.stopRenderLoop();
    this._scene.dispose();
    this._engine.dispose();
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/plugins/plugin-spacetime/src/engine/scene-manager.ts
git commit -m "feat(plugin-spacetime): add Babylon.js scene manager"
```

---

### Task 6: Create the Manifold-to-Babylon mesh converter

**Files:**

- Create: `packages/plugins/plugin-spacetime/src/engine/mesh-converter.ts`

- [ ] **Step 1: Create engine/mesh-converter.ts**

Converts Manifold geometry to Babylon.js meshes with per-face ID tracking for picking.

```typescript
//
// Copyright 2026 DXOS.org
//

import { Color3, Mesh, StandardMaterial, VertexData, type Scene } from '@babylonjs/core';
import type ManifoldModule from 'manifold-3d';

export type ConvertOptions = {
  scene: Scene;
  name?: string;
  color?: Color3;
};

/**
 * Converts a Manifold object to a Babylon.js Mesh.
 * Returns the mesh and the raw mesh data for face picking.
 */
export const manifoldToBabylon = (
  manifold: InstanceType<ManifoldModule['Manifold']>,
  { scene, name = 'manifold-mesh', color = new Color3(0.4, 0.6, 0.9) }: ConvertOptions,
): Mesh => {
  const meshGL = manifold.getMesh();

  const numVert = meshGL.numVert;
  const numTri = meshGL.numTri;
  const vertProperties = meshGL.vertProperties;
  const triVerts = meshGL.triVerts;
  const numProp = meshGL.numProp;

  // Extract positions (first 3 properties per vertex).
  const positions = new Float32Array(numVert * 3);
  for (let i = 0; i < numVert; i++) {
    positions[i * 3] = vertProperties[i * numProp];
    positions[i * 3 + 1] = vertProperties[i * numProp + 1];
    positions[i * 3 + 2] = vertProperties[i * numProp + 2];
  }

  // Extract indices.
  const indices = new Uint32Array(numTri * 3);
  for (let i = 0; i < numTri * 3; i++) {
    indices[i] = triVerts[i];
  }

  const mesh = new Mesh(name, scene);
  const vertexData = new VertexData();
  vertexData.positions = positions;
  vertexData.indices = indices;

  // Compute normals from geometry.
  const normals: number[] = [];
  VertexData.ComputeNormals(positions, indices, normals);
  vertexData.normals = normals;

  vertexData.applyToMesh(mesh);

  const material = new StandardMaterial(`${name}-material`, scene);
  material.diffuseColor = color;
  material.specularColor = new Color3(0.2, 0.2, 0.2);
  material.backFaceCulling = true;
  mesh.material = material;

  return mesh;
};

/**
 * Returns the face index (triangle index) from a Babylon.js pick result.
 */
export const getPickedFaceIndex = (faceId: number): number => {
  return faceId;
};

/**
 * Computes the face normal from triangle indices and vertex positions.
 */
export const getFaceNormal = (
  faceId: number,
  positions: ArrayLike<number>,
  indices: ArrayLike<number>,
): { x: number; y: number; z: number } => {
  const i0 = indices[faceId * 3];
  const i1 = indices[faceId * 3 + 1];
  const i2 = indices[faceId * 3 + 2];

  const ax = positions[i1 * 3] - positions[i0 * 3];
  const ay = positions[i1 * 3 + 1] - positions[i0 * 3 + 1];
  const az = positions[i1 * 3 + 2] - positions[i0 * 3 + 2];

  const bx = positions[i2 * 3] - positions[i0 * 3];
  const by = positions[i2 * 3 + 1] - positions[i0 * 3 + 1];
  const bz = positions[i2 * 3 + 2] - positions[i0 * 3 + 2];

  const nx = ay * bz - az * by;
  const ny = az * bx - ax * bz;
  const nz = ax * by - ay * bx;

  const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
  return { x: nx / len, y: ny / len, z: nz / len };
};
```

- [ ] **Step 2: Commit**

```bash
git add packages/plugins/plugin-spacetime/src/engine/mesh-converter.ts
git commit -m "feat(plugin-spacetime): add Manifold-to-Babylon mesh converter"
```

---

### Task 7: Create the SpacetimeEditor component

**Files:**

- Create: `packages/plugins/plugin-spacetime/src/components/SpacetimeEditor/SpacetimeEditor.tsx`
- Create: `packages/plugins/plugin-spacetime/src/components/SpacetimeEditor/index.ts`
- Create: `packages/plugins/plugin-spacetime/src/components/index.ts`

This is the core 3D editor with cube rendering, face selection, and shift-drag extrusion.

- [ ] **Step 1: Create components/SpacetimeEditor/SpacetimeEditor.tsx**

```tsx
//
// Copyright 2026 DXOS.org
//

import { Color3, type Mesh, PointerEventTypes, Vector3, HighlightLayer } from '@babylonjs/core';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { SceneManager } from '../../engine';
import { getManifold } from '../../engine';
import { manifoldToBabylon, getFaceNormal } from '../../engine';

export type SpacetimeEditorProps = {
  className?: string;
};

type EditorState = {
  /** Currently selected face index, or null. */
  selectedFace: number | null;
  /** Normal of the selected face. */
  selectedNormal: { x: number; y: number; z: number } | null;
  /** Whether user is currently extruding (shift + drag). */
  extruding: boolean;
  /** Starting Y screen position for extrusion drag. */
  extrudeStartY: number;
  /** Current extrusion distance. */
  extrudeDistance: number;
};

const INITIAL_STATE: EditorState = {
  selectedFace: null,
  selectedNormal: null,
  extruding: false,
  extrudeStartY: 0,
  extrudeDistance: 0,
};

const CUBE_COLOR = new Color3(0.4, 0.6, 0.9);
const HIGHLIGHT_COLOR = new Color3(1.0, 0.8, 0.0);
const EXTRUDE_SENSITIVITY = 0.02;

export const SpacetimeEditor = ({ className }: SpacetimeEditorProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const managerRef = useRef<SceneManager | null>(null);
  const meshRef = useRef<Mesh | null>(null);
  const highlightRef = useRef<HighlightLayer | null>(null);
  const stateRef = useRef<EditorState>({ ...INITIAL_STATE });
  const [ready, setReady] = useState(false);

  const rebuildMesh = useCallback(
    async (extrudeDistance: number, faceNormal: { x: number; y: number; z: number } | null) => {
      const manager = managerRef.current;
      if (!manager) {
        return;
      }

      const wasm = await getManifold();
      const { Manifold } = wasm;

      // Start with a unit cube centered at origin.
      let solid = Manifold.cube([2, 2, 2], true);

      // If extruding, add a box along the face normal.
      if (faceNormal && extrudeDistance > 0) {
        const normal = new Vector3(faceNormal.x, faceNormal.y, faceNormal.z);
        const dist = extrudeDistance;

        // Create extrusion box: thin slab along the normal direction.
        const extrudeBox = Manifold.cube(
          [normal.x !== 0 ? dist : 2, normal.y !== 0 ? dist : 2, normal.z !== 0 ? dist : 2],
          true,
        );

        // Position the extrusion box on the face.
        const offset = normal.scale(1 + dist / 2);
        const translated = extrudeBox.translate([offset.x, offset.y, offset.z]);

        solid = Manifold.union(solid, translated);
        translated.delete();
        extrudeBox.delete();
      }

      // Remove old mesh.
      if (meshRef.current) {
        meshRef.current.dispose();
      }

      meshRef.current = manifoldToBabylon(solid, {
        scene: manager.scene,
        name: 'solid',
        color: CUBE_COLOR,
      });

      // Re-apply highlight if a face is selected.
      if (highlightRef.current && stateRef.current.selectedFace !== null) {
        highlightRef.current.removeAllMeshes();
        highlightRef.current.addMesh(meshRef.current, HIGHLIGHT_COLOR);
      }

      solid.delete();
    },
    [],
  );

  // Initialize Babylon.js scene and Manifold, render initial cube.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const manager = new SceneManager({ canvas });
    managerRef.current = manager;

    highlightRef.current = new HighlightLayer('highlight', manager.scene);

    // Build initial cube.
    void rebuildMesh(0, null).then(() => setReady(true));

    // Handle window resize.
    const handleResize = () => manager.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      manager.dispose();
      managerRef.current = null;
    };
  }, [rebuildMesh]);

  // Set up pointer interaction for face picking and extrusion.
  useEffect(() => {
    const manager = managerRef.current;
    if (!manager || !ready) {
      return;
    }

    const scene = manager.scene;

    const observer = scene.onPointerObservable.add((pointerInfo) => {
      const state = stateRef.current;

      switch (pointerInfo.type) {
        case PointerEventTypes.POINTERDOWN: {
          if (!pointerInfo.pickInfo?.hit || pointerInfo.pickInfo.pickedMesh !== meshRef.current) {
            // Click on empty space — deselect.
            state.selectedFace = null;
            state.selectedNormal = null;
            highlightRef.current?.removeAllMeshes();
            return;
          }

          const faceId = pointerInfo.pickInfo.faceId;
          if (faceId === -1) {
            return;
          }

          const mesh = meshRef.current!;
          const positions = mesh.getVerticesData('position')!;
          const indices = mesh.getIndices()!;
          const normal = getFaceNormal(faceId, positions, indices);

          state.selectedFace = faceId;
          state.selectedNormal = normal;

          highlightRef.current?.removeAllMeshes();
          highlightRef.current?.addMesh(mesh, HIGHLIGHT_COLOR);

          // Start extrusion if shift is held.
          const event = pointerInfo.event as PointerEvent;
          if (event.shiftKey) {
            state.extruding = true;
            state.extrudeStartY = event.clientY;
            state.extrudeDistance = 0;
            manager.camera.detachControl();
          }
          break;
        }

        case PointerEventTypes.POINTERMOVE: {
          if (!state.extruding) {
            return;
          }

          const event = pointerInfo.event as PointerEvent;
          const deltaY = state.extrudeStartY - event.clientY;
          state.extrudeDistance = Math.max(0, deltaY * EXTRUDE_SENSITIVITY);

          void rebuildMesh(state.extrudeDistance, state.selectedNormal);
          break;
        }

        case PointerEventTypes.POINTERUP: {
          if (state.extruding) {
            state.extruding = false;
            manager.camera.attachControl(canvasRef.current!, true);
          }
          break;
        }
      }
    });

    return () => {
      scene.onPointerObservable.remove(observer);
    };
  }, [ready, rebuildMesh]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: '100%', height: '100%', display: 'block', outline: 'none' }}
      onContextMenu={(event) => event.preventDefault()}
    />
  );
};
```

- [ ] **Step 2: Create components/SpacetimeEditor/index.ts**

```typescript
//
// Copyright 2026 DXOS.org
//

export * from './SpacetimeEditor';
```

- [ ] **Step 3: Create components/index.ts**

```typescript
//
// Copyright 2026 DXOS.org
//

export * from './SpacetimeEditor';
```

- [ ] **Step 4: Commit**

```bash
git add packages/plugins/plugin-spacetime/src/components/
git commit -m "feat(plugin-spacetime): add SpacetimeEditor component with face picking and extrusion"
```

---

### Task 8: Create storybook stories

**Files:**

- Create: `packages/plugins/plugin-spacetime/src/components/SpacetimeEditor/SpacetimeEditor.stories.tsx`

- [ ] **Step 1: Create SpacetimeEditor.stories.tsx**

```tsx
//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { SpacetimeEditor } from './SpacetimeEditor';

const DefaultStory = () => {
  return <SpacetimeEditor className='w-full h-full' />;
};

const meta = {
  title: 'plugins/plugin-spacetime/SpacetimeEditor',
  component: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};
```

- [ ] **Step 2: Verify the story renders in storybook**

Run: `moon run storybook-react:serve`
Navigate to `plugins/plugin-spacetime/SpacetimeEditor` in the storybook sidebar.
Expected: A blue cube rendered in the viewport. Orbit by dragging. Click a face to highlight it (yellow). Shift+drag on a selected face to extrude.

- [ ] **Step 3: Commit**

```bash
git add packages/plugins/plugin-spacetime/src/components/SpacetimeEditor/SpacetimeEditor.stories.tsx
git commit -m "feat(plugin-spacetime): add SpacetimeEditor storybook story"
```

---

### Task 9: Create plugin capabilities and main plugin file

**Files:**

- Create: `packages/plugins/plugin-spacetime/src/capabilities/react-surface/react-surface.tsx`
- Create: `packages/plugins/plugin-spacetime/src/capabilities/react-surface/index.ts`
- Create: `packages/plugins/plugin-spacetime/src/capabilities/index.ts`
- Create: `packages/plugins/plugin-spacetime/src/containers/SpacetimeArticle/SpacetimeArticle.tsx`
- Create: `packages/plugins/plugin-spacetime/src/containers/SpacetimeArticle/index.ts`
- Create: `packages/plugins/plugin-spacetime/src/containers/index.ts`
- Create: `packages/plugins/plugin-spacetime/src/SpacetimePlugin.tsx`
- Create: `packages/plugins/plugin-spacetime/src/index.ts`

- [ ] **Step 1: Create containers/SpacetimeArticle/SpacetimeArticle.tsx**

```tsx
//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { SpacetimeEditor } from '../../components';

export type SpacetimeArticleProps = {
  subject: unknown;
  role?: string;
};

const SpacetimeArticle = ({ role }: SpacetimeArticleProps) => {
  return (
    <div role={role} className='flex w-full h-full overflow-hidden'>
      <SpacetimeEditor className='w-full h-full' />
    </div>
  );
};

export default SpacetimeArticle;
```

- [ ] **Step 2: Create containers/SpacetimeArticle/index.ts**

```typescript
//
// Copyright 2026 DXOS.org
//

export { default as SpacetimeArticle } from './SpacetimeArticle';
export type { SpacetimeArticleProps } from './SpacetimeArticle';
```

- [ ] **Step 3: Create containers/index.ts**

```typescript
//
// Copyright 2026 DXOS.org
//

import { lazy } from 'react';

export const SpacetimeArticle = lazy(() => import('./SpacetimeArticle'));
```

- [ ] **Step 4: Create capabilities/react-surface/react-surface.tsx**

```tsx
//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { Obj } from '@dxos/echo';

import { SpacetimeArticle } from '../../containers';
import { meta } from '../../meta';
import { Spacetime } from '../../types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(
      Capabilities.ReactSurface,
      Surface.create({
        id: meta.id,
        role: 'article',
        filter: (data): data is { subject: Scene.Scene } => Obj.instanceOf(Scene.Scene, data.subject),
        component: ({ data, role }: { data: { subject: Scene.Scene }; role: string }) => (
          <SpacetimeArticle role={role} subject={data.subject} />
        ),
      }),
    ),
  ),
);
```

- [ ] **Step 5: Create capabilities/react-surface/index.ts**

```typescript
//
// Copyright 2026 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const ReactSurface = Capability.lazy('ReactSurface', () => import('./react-surface'));
```

- [ ] **Step 6: Create capabilities/index.ts**

```typescript
//
// Copyright 2026 DXOS.org
//

export * from './react-surface';
```

- [ ] **Step 7: Create SpacetimePlugin.tsx**

```tsx
//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { Annotation } from '@dxos/echo';
import { Operation } from '@dxos/operation';
import { type CreateObject } from '@dxos/plugin-space/types';
import { SpaceOperation } from '@dxos/plugin-space/operations';

import { ReactSurface } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';
import { Spacetime } from './types';

export const SpacetimePlugin = Plugin.define(meta).pipe(
  AppPlugin.addMetadataModule({
    metadata: {
      id: Scene.Scene.typename,
      metadata: {
        icon: Annotation.IconAnnotation.get(Scene.Scene).pipe(Option.getOrThrow).icon,
        iconHue: Annotation.IconAnnotation.get(Scene.Scene).pipe(Option.getOrThrow).hue ?? 'white',
        createObject: ((props, options) =>
          Effect.gen(function* () {
            const object = Spacetime.make(props);
            return yield* Operation.invoke(SpaceOperation.AddObject, {
              object,
              target: options.target,
              hidden: true,
              targetNodeId: options.targetNodeId,
            });
          })) satisfies CreateObject,
      },
    },
  }),
  AppPlugin.addSchemaModule({ schema: [Scene.Scene] }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.make,
);
```

- [ ] **Step 8: Create src/index.ts**

```typescript
//
// Copyright 2026 DXOS.org
//

export * from './meta';
export * from './SpacetimePlugin';
```

- [ ] **Step 9: Build the plugin**

Run: `moon run plugin-spacetime:build`
Expected: Build succeeds with no errors. Ignore the DEPOT_TOKEN warning.

- [ ] **Step 10: Commit**

```bash
git add packages/plugins/plugin-spacetime/src/
git commit -m "feat(plugin-spacetime): add plugin definition, capabilities, and containers"
```

---

### Task 10: Verify storybook and format/lint

- [ ] **Step 1: Run storybook and verify the story loads**

Run: `moon run storybook-react:serve`
Navigate to `plugins/plugin-spacetime/SpacetimeEditor` story.
Expected: Interactive 3D cube with:

- Orbit rotation (click and drag)
- Face selection (click on a face → yellow highlight)
- Extrusion (shift + drag on selected face → geometry extends outward)

- [ ] **Step 2: Format code**

Run: `pnpm format`
Expected: No errors.

- [ ] **Step 3: Lint**

Run: `moon run plugin-spacetime:lint -- --fix`
Expected: No errors (or only auto-fixed issues).

- [ ] **Step 4: Commit any formatting/lint fixes**

```bash
git add -A
git commit -m "style(plugin-spacetime): format and lint fixes"
```

---

### Task 11: Update SPEC.md with decisions

**Files:**

- Modify: `packages/plugins/plugin-spacetime/SPEC.md`

- [ ] **Step 1: Update the Phase 1 checklist**

Update the SPEC.md to mark Phase 1 items as complete and record the technology decisions:

```markdown
## Phase 1

- [x] Decide on the best Typescript 3d engine to use for the plugin — **Babylon.js** (@babylonjs/core)
  - Chosen for: native TypeScript, built-in scene picking, CSG gizmos, WebGPU-ready.
- [x] Decide on the topology library — **Manifold** (manifold-3d)
  - Chosen for: fast boolean operations (~1MB WASM), clean API, watertight output guarantees.
  - OpenCascade.js deferred to future phases if BREP/parametric features needed.
- [x] Create the basic plugin structure, incl. types, settings, and components.
- [x] Create a minimal storybook-driven experiment that renders a cube and allows the user to extrude surfaces.
  - [x] The user should be able to rotate the scene.
  - [x] The user should be able to click on a surface to select it.
  - [x] The user should be able to extrude the selected surface by holding shift and moving the mouse.
```

- [ ] **Step 2: Commit**

```bash
git add packages/plugins/plugin-spacetime/SPEC.md
git commit -m "docs(plugin-spacetime): update SPEC.md with Phase 1 decisions and status"
```
