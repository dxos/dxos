# plugin-tile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a tile pattern design tool plugin supporting square, triangle, and hex grids with real-world dimensions, grout, room fitting, presets, and SVG export.

**Architecture:** DXOS Composer plugin following the plugin-tictactoe pattern. SVG-based renderer with virtual viewport for performance. Pure GridGeometry service for coordinate math. ECHO-backed TilePattern schema for collaborative editing.

**Tech Stack:** TypeScript, React, Effect Schema, ECHO, SVG, @dxos/app-framework, @dxos/app-toolkit

---

## File Structure

```
packages/plugins/plugin-tile/
  PLUGIN.mdl                          # (exists) Specification
  PLAN.md                             # (exists) This plan
  package.json                        # Package config
  moon.yml                            # Build tasks
  tsconfig.json                       # TypeScript config
  vitest.config.ts                    # Test config
  src/
    index.ts                          # Root exports: meta, types, TilePlugin
    meta.ts                           # Plugin.Meta
    translations.ts                   # i18n resources
    TilePlugin.tsx                    # Plugin definition
    types/
      index.ts                        # export * as Tile from './Tile'
      Tile.ts                         # ECHO schema: TilePattern
    geometry/
      index.ts                        # barrel exports
      types.ts                        # Coord, ViewBox, GridConfig types
      axial.ts                        # axialToPixel, pixelToAxial per grid type
      vertices.ts                     # tileVertices per grid type
      viewport.ts                     # visibleRange calculation
      measurement.ts                  # gridToPhysical, fitToRoom
      axial.test.ts                   # coordinate conversion tests
      vertices.test.ts                # vertex generation tests
      viewport.test.ts                # viewport culling tests
      measurement.test.ts             # measurement/fitting tests
    presets/
      index.ts                        # barrel exports
      presets.ts                      # checkerboard, herringbone, etc.
      presets.test.ts                 # preset generation tests
    components/
      index.ts                        # barrel exports
      TileCell/
        index.ts
        TileCell.tsx                  # SVG polygon for one tile
      TileGrid/
        index.ts
        TileGrid.tsx                  # Renders visible cells
      TileCanvas/
        index.ts
        TileCanvas.tsx                # SVG viewport with pan/zoom
        TileCanvas.stories.tsx        # Storybook
    containers/
      index.ts                        # lazy exports
      TileArticle/
        index.ts                      # default export bridge
        TileArticle.tsx               # Article container
        TileArticle.stories.tsx       # Storybook
      TileCard/
        index.ts                      # default export bridge
        TileCard.tsx                  # Card thumbnail
    capabilities/
      index.ts                        # Capability.lazy exports
      react-surface.tsx               # Surface registrations
    operations/
      index.ts                        # barrel + OperationHandlerSet.lazy
      definitions.ts                  # Operation.make for create, applyPreset, export
      create.ts                       # create handler
      apply-preset.ts                 # applyPreset handler
```

---

### Task 1: Package Skeleton

**Files:**
- Create: `package.json`
- Create: `moon.yml`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `src/meta.ts`
- Create: `src/translations.ts`
- Create: `src/types/index.ts`
- Create: `src/types/Tile.ts`
- Create: `src/index.ts`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "@dxos/plugin-tile",
  "version": "0.8.3",
  "private": true,
  "description": "Tile pattern design tool plugin for DXOS Composer.",
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
  "imports": {
    "#capabilities": "./src/capabilities/index.ts",
    "#components": "./src/components/index.ts",
    "#containers": "./src/containers/index.ts",
    "#geometry": "./src/geometry/index.ts",
    "#meta": "./src/meta.ts",
    "#operations": "./src/operations/index.ts",
    "#presets": "./src/presets/index.ts",
    "#types": "./src/types/index.ts"
  },
  "exports": {
    ".": {
      "source": "./src/index.ts",
      "types": "./dist/types/src/index.d.ts",
      "browser": "./dist/lib/browser/index.mjs",
      "node": "./dist/lib/node-esm/index.mjs"
    },
    "./types": {
      "source": "./src/types/index.ts",
      "types": "./dist/types/src/types/index.d.ts",
      "browser": "./dist/lib/browser/types/index.mjs",
      "node": "./dist/lib/node-esm/types/index.mjs"
    },
    "./operations": {
      "source": "./src/operations/index.ts",
      "types": "./dist/types/src/operations/index.d.ts",
      "browser": "./dist/lib/browser/operations/index.mjs",
      "node": "./dist/lib/node-esm/operations/index.mjs"
    }
  },
  "types": "dist/types/src/index.d.ts",
  "typesVersions": {
    "*": {
      "types": [
        "dist/types/src/types/index.d.ts"
      ]
    }
  },
  "files": [
    "dist",
    "src"
  ],
  "dependencies": {
    "@dxos/app-framework": "workspace:*",
    "@dxos/app-toolkit": "workspace:*",
    "@dxos/echo": "workspace:*",
    "@dxos/echo-react": "workspace:*",
    "@dxos/log": "workspace:*",
    "@dxos/operation": "workspace:*",
    "@dxos/plugin-space": "workspace:*",
    "@dxos/react-ui": "workspace:*",
    "@dxos/schema": "workspace:*",
    "@dxos/util": "workspace:*",
    "effect": "catalog:"
  },
  "devDependencies": {
    "@dxos/plugin-theme": "workspace:*",
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
    "react": "catalog:",
    "react-dom": "catalog:"
  },
  "publishConfig": {
    "access": "public"
  }
}
```

- [ ] **Step 2: Create moon.yml**

```yaml
layer: library
language: typescript
tags:
  - ts-build
  - ts-test
  - pack
tasks:
  compile:
    args:
      - '--entryPoint=src/index.ts'
      - '--entryPoint=src/operations/index.ts'
      - '--entryPoint=src/types/index.ts'
```

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "extends": [
    "../../../tsconfig.base.json"
  ],
  "compilerOptions": {
    "types": [
      "node"
    ]
  },
  "exclude": [
    "*.t.ts",
    "vite.config.ts"
  ],
  "include": [
    "src/**/*.ts",
    "src/**/*.tsx",
    "src/*.ts"
  ],
  "references": [
    { "path": "../../common/log" },
    { "path": "../../common/util" },
    { "path": "../../core/echo/echo" },
    { "path": "../../core/echo/echo-react" },
    { "path": "../../core/operation" },
    { "path": "../../sdk/app-framework" },
    { "path": "../../sdk/app-toolkit" },
    { "path": "../../sdk/schema" },
    { "path": "../../ui/react-ui" },
    { "path": "../../ui/ui-theme" },
    { "path": "../plugin-space" },
    { "path": "../plugin-theme" }
  ]
}
```

- [ ] **Step 4: Create vitest.config.ts**

```typescript
//
// Copyright 2026 DXOS.org
//

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createConfig } from '../../../vitest.base.config';

export default createConfig({
  dirname: typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url)),
  node: true,
});
```

- [ ] **Step 5: Create src/meta.ts**

```typescript
//
// Copyright 2026 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: Plugin.Meta = {
  id: 'org.dxos.plugin.tile',
  name: 'Tile',
  description: trim`
    Design tool for creating tile patterns including tessellations.
    Supports square, triangle, and hex grids with real-world dimensions.
  `,
  icon: 'ph--grid-nine--regular',
  iconHue: 'teal',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-tile',
};
```

- [ ] **Step 6: Create src/types/Tile.ts**

```typescript
//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Annotation, Obj, Type } from '@dxos/echo';
import { LabelAnnotation } from '@dxos/echo/internal';

export const GridType = Schema.Literal('square', 'triangle', 'hex');
export type GridType = Schema.Schema.Type<typeof GridType>;

export const RepeatMode = Schema.Literal('single', 'repeat');
export type RepeatMode = Schema.Schema.Type<typeof RepeatMode>;

export const Pattern = Schema.Struct({
  name: Schema.optional(Schema.String),
  gridType: GridType.annotations({ description: 'Tile geometry: square, triangle, or hex.' }),
  gridWidth: Schema.Number.annotations({ description: 'Number of columns (axial q range).' }),
  gridHeight: Schema.Number.annotations({ description: 'Number of rows (axial r range).' }),
  tileSize: Schema.Number.annotations({ description: 'Tile side length in mm.' }),
  groutWidth: Schema.Number.annotations({ description: 'Grout gap in mm.' }),
  width: Schema.optional(Schema.Number.annotations({ description: 'Target surface width in mm.' })),
  height: Schema.optional(Schema.Number.annotations({ description: 'Target surface height in mm.' })),
  repeatMode: RepeatMode.annotations({ description: 'Single canvas or repeating motif.' }),
  repeatWidth: Schema.optional(Schema.Number.annotations({ description: 'Motif width in cells (repeat mode).' })),
  repeatHeight: Schema.optional(Schema.Number.annotations({ description: 'Motif height in cells (repeat mode).' })),
  cells: Schema.Record({ key: Schema.String, value: Schema.String }).annotations({
    description: 'Map of "q,r" coordinate keys to color hex strings.',
  }),
}).pipe(
  Type.object({
    typename: 'org.dxos.type.tile',
    version: '0.1.0',
  }),
  LabelAnnotation.set(['name']),
  Annotation.IconAnnotation.set({
    icon: 'ph--grid-nine--regular',
    hue: 'teal',
  }),
);

export interface Pattern extends Schema.Schema.Type<typeof Pattern> {}

export const make = ({
  name,
  gridType = 'square',
  gridWidth = 10,
  gridHeight = 10,
  tileSize = 50,
  groutWidth = 2,
  repeatMode = 'single',
}: {
  name?: string;
  gridType?: GridType;
  gridWidth?: number;
  gridHeight?: number;
  tileSize?: number;
  groutWidth?: number;
  repeatMode?: RepeatMode;
} = {}) =>
  Obj.make(Pattern, {
    name,
    gridType,
    gridWidth,
    gridHeight,
    tileSize,
    groutWidth,
    repeatMode,
    cells: {},
  });
```

- [ ] **Step 7: Create src/types/index.ts**

```typescript
//
// Copyright 2026 DXOS.org
//

export * as Tile from './Tile';
```

- [ ] **Step 8: Create src/translations.ts**

```typescript
//
// Copyright 2026 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { meta } from '#meta';
import { Tile } from '#types';

export const translations = [
  {
    'en-US': {
      [Tile.Pattern.typename]: {
        'typename.label': 'Tile Pattern',
        'typename.label_zero': 'Tile Patterns',
        'typename.label_one': 'Tile Pattern',
        'typename.label_other': 'Tile Patterns',
        'object-name.placeholder': 'New pattern',
        'add-object.label': 'Add pattern',
        'rename-object.label': 'Rename pattern',
        'delete-object.label': 'Delete pattern',
        'object-deleted.label': 'Pattern deleted',
      },
      [meta.id]: {
        'plugin.name': 'Tile',
        'square.label': 'Square',
        'triangle.label': 'Triangle',
        'hex.label': 'Hex',
        'single.label': 'Single',
        'repeat.label': 'Repeat',
        'export-svg.label': 'Export SVG',
        'export-png.label': 'Export PNG',
        'preset.label': 'Apply Preset',
      },
    },
  },
] as const satisfies Resource[];
```

- [ ] **Step 9: Create src/index.ts**

```typescript
//
// Copyright 2026 DXOS.org
//

export * from './meta';
export * from './types';

export * from './TilePlugin';
```

- [ ] **Step 10: Run pnpm install from worktree root**

Run: `cd .claude/worktrees/plugin-tile && pnpm install`

- [ ] **Step 11: Verify build compiles**

Run: `moon run plugin-tile:build`
Expected: Build succeeds (will fail until TilePlugin.tsx exists — that's OK, we'll add it in Task 5)

- [ ] **Step 12: Commit skeleton**

```bash
git add packages/plugins/plugin-tile/
git commit -m "feat(plugin-tile): add package skeleton with types and meta"
```

---

### Task 2: Grid Geometry — Coordinate Conversion

**Files:**
- Create: `src/geometry/types.ts`
- Create: `src/geometry/axial.ts`
- Create: `src/geometry/axial.test.ts`
- Create: `src/geometry/index.ts`

- [ ] **Step 1: Create src/geometry/types.ts**

```typescript
//
// Copyright 2026 DXOS.org
//

import { type Tile } from '#types';

export interface Coord {
  q: number;
  r: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface ViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GridConfig {
  gridType: Tile.GridType;
  tileSize: number;
  groutWidth: number;
}
```

- [ ] **Step 2: Write failing tests for axialToPixel (src/geometry/axial.test.ts)**

```typescript
//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { axialToPixel, pixelToAxial } from './axial';

describe('axialToPixel', () => {
  test('square grid origin', ({ expect }) => {
    const point = axialToPixel(0, 0, 'square', 50);
    expect(point).toEqual({ x: 0, y: 0 });
  });

  test('square grid offset', ({ expect }) => {
    const point = axialToPixel(3, 2, 'square', 50);
    expect(point).toEqual({ x: 150, y: 100 });
  });

  test('hex grid origin', ({ expect }) => {
    const point = axialToPixel(0, 0, 'hex', 50);
    expect(point).toEqual({ x: 0, y: 0 });
  });

  test('hex grid flat-top offset', ({ expect }) => {
    const point = axialToPixel(1, 0, 'hex', 50);
    // Flat-top hex: x = size * 3/2 * q, y = size * sqrt(3) * (r + q/2)
    expect(point.x).toBeCloseTo(75);
    expect(point.y).toBeCloseTo(43.301, 2);
  });

  test('triangle grid origin', ({ expect }) => {
    const point = axialToPixel(0, 0, 'triangle', 50);
    expect(point).toEqual({ x: 0, y: 0 });
  });

  test('triangle grid offset', ({ expect }) => {
    const point = axialToPixel(1, 0, 'triangle', 50);
    // Triangle: x = size/2 * q, y = size * sqrt(3)/2 * r
    expect(point.x).toBeCloseTo(25);
    expect(point.y).toBeCloseTo(0);
  });
});

describe('pixelToAxial', () => {
  test('square grid round-trip', ({ expect }) => {
    const coord = pixelToAxial(150, 100, 'square', 50);
    expect(coord).toEqual({ q: 3, r: 2 });
  });

  test('hex grid round-trip', ({ expect }) => {
    const pixel = axialToPixel(2, 1, 'hex', 50);
    const coord = pixelToAxial(pixel.x, pixel.y, 'hex', 50);
    expect(coord).toEqual({ q: 2, r: 1 });
  });

  test('triangle grid round-trip', ({ expect }) => {
    const pixel = axialToPixel(3, 2, 'triangle', 50);
    const coord = pixelToAxial(pixel.x, pixel.y, 'triangle', 50);
    expect(coord).toEqual({ q: 3, r: 2 });
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `moon run plugin-tile:test -- src/geometry/axial.test.ts`
Expected: FAIL — module not found

- [ ] **Step 4: Implement axial.ts**

```typescript
//
// Copyright 2026 DXOS.org
//

import { type Tile } from '#types';

import { type Point, type Coord } from './types';

/**
 * Convert axial (q, r) coordinates to pixel (x, y) center point.
 */
export const axialToPixel = (q: number, r: number, gridType: Tile.GridType, tileSize: number): Point => {
  switch (gridType) {
    case 'square':
      return { x: q * tileSize, y: r * tileSize };

    case 'hex': {
      // Flat-top hexagon.
      const x = tileSize * (3 / 2) * q;
      const y = tileSize * Math.sqrt(3) * (r + q / 2);
      return { x, y };
    }

    case 'triangle': {
      // Alternating up/down triangles. q indexes within row, r indexes row.
      const x = (tileSize / 2) * q;
      const y = ((tileSize * Math.sqrt(3)) / 2) * r;
      return { x, y };
    }
  }
};

/**
 * Convert pixel (x, y) to nearest axial (q, r) coordinate.
 */
export const pixelToAxial = (x: number, y: number, gridType: Tile.GridType, tileSize: number): Coord => {
  switch (gridType) {
    case 'square':
      return { q: Math.round(x / tileSize), r: Math.round(y / tileSize) };

    case 'hex': {
      // Inverse of flat-top hex formula.
      const q = (2 / 3) * x / tileSize;
      const r = ((-1 / 3) * x + (Math.sqrt(3) / 3) * y) / tileSize;
      // Round to nearest hex using cube coordinate rounding.
      return hexRound(q, r);
    }

    case 'triangle': {
      const r = Math.round(y / ((tileSize * Math.sqrt(3)) / 2));
      const q = Math.round(x / (tileSize / 2));
      return { q, r };
    }
  }
};

/**
 * Round fractional axial hex coordinates to nearest integer hex.
 */
const hexRound = (q: number, r: number): Coord => {
  const s = -q - r;
  let rq = Math.round(q);
  let rr = Math.round(r);
  const rs = Math.round(s);

  const dq = Math.abs(rq - q);
  const dr = Math.abs(rr - r);
  const ds = Math.abs(rs - s);

  if (dq > dr && dq > ds) {
    rq = -rr - rs;
  } else if (dr > ds) {
    rr = -rq - rs;
  }

  return { q: rq, r: rr };
};
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `moon run plugin-tile:test -- src/geometry/axial.test.ts`
Expected: PASS

- [ ] **Step 6: Create src/geometry/index.ts barrel**

```typescript
//
// Copyright 2026 DXOS.org
//

export * from './types';
export * from './axial';
export * from './vertices';
export * from './viewport';
export * from './measurement';
```

Note: This will import modules not yet created. Create placeholder files or comment out until Tasks 3-4 complete. Alternatively, export only what exists now and add as we go.

- [ ] **Step 7: Commit**

```bash
git add packages/plugins/plugin-tile/src/geometry/
git commit -m "feat(plugin-tile): add axial coordinate conversion with tests"
```

---

### Task 3: Grid Geometry — Vertices and Viewport

**Files:**
- Create: `src/geometry/vertices.ts`
- Create: `src/geometry/vertices.test.ts`
- Create: `src/geometry/viewport.ts`
- Create: `src/geometry/viewport.test.ts`

- [ ] **Step 1: Write failing tests for tileVertices (src/geometry/vertices.test.ts)**

```typescript
//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { tileVertices } from './vertices';

describe('tileVertices', () => {
  test('square returns 4 vertices', ({ expect }) => {
    const points = tileVertices(0, 0, 'square', 50);
    expect(points).toHaveLength(4);
  });

  test('square vertices form a square', ({ expect }) => {
    const points = tileVertices(0, 0, 'square', 50);
    // Top-left origin square: corners at (-25,-25), (25,-25), (25,25), (-25,25)
    expect(points[0]).toEqual({ x: -25, y: -25 });
    expect(points[1]).toEqual({ x: 25, y: -25 });
    expect(points[2]).toEqual({ x: 25, y: 25 });
    expect(points[3]).toEqual({ x: -25, y: 25 });
  });

  test('hex returns 6 vertices', ({ expect }) => {
    const points = tileVertices(0, 0, 'hex', 50);
    expect(points).toHaveLength(6);
  });

  test('triangle up returns 3 vertices', ({ expect }) => {
    // Even q + r = up-pointing triangle.
    const points = tileVertices(0, 0, 'triangle', 50);
    expect(points).toHaveLength(3);
  });

  test('triangle down returns 3 vertices', ({ expect }) => {
    // Odd q + r = down-pointing triangle.
    const points = tileVertices(1, 0, 'triangle', 50);
    expect(points).toHaveLength(3);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `moon run plugin-tile:test -- src/geometry/vertices.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement vertices.ts**

```typescript
//
// Copyright 2026 DXOS.org
//

import { type Tile } from '#types';

import { axialToPixel } from './axial';
import { type Point } from './types';

/**
 * Get polygon vertices for a tile at axial (q, r).
 * Returns array of {x, y} points in drawing order.
 */
export const tileVertices = (q: number, r: number, gridType: Tile.GridType, tileSize: number): Point[] => {
  const center = axialToPixel(q, r, gridType, tileSize);

  switch (gridType) {
    case 'square': {
      const half = tileSize / 2;
      return [
        { x: center.x - half, y: center.y - half },
        { x: center.x + half, y: center.y - half },
        { x: center.x + half, y: center.y + half },
        { x: center.x - half, y: center.y + half },
      ];
    }

    case 'hex': {
      // Flat-top hexagon: vertices at 0°, 60°, 120°, 180°, 240°, 300°.
      return Array.from({ length: 6 }, (_, i) => {
        const angle = (Math.PI / 180) * (60 * i);
        return {
          x: center.x + tileSize * Math.cos(angle),
          y: center.y + tileSize * Math.sin(angle),
        };
      });
    }

    case 'triangle': {
      const h = (tileSize * Math.sqrt(3)) / 2;
      const isUp = (q + r) % 2 === 0;

      if (isUp) {
        return [
          { x: center.x, y: center.y - (2 / 3) * h },
          { x: center.x + tileSize / 2, y: center.y + (1 / 3) * h },
          { x: center.x - tileSize / 2, y: center.y + (1 / 3) * h },
        ];
      } else {
        return [
          { x: center.x, y: center.y + (2 / 3) * h },
          { x: center.x + tileSize / 2, y: center.y - (1 / 3) * h },
          { x: center.x - tileSize / 2, y: center.y - (1 / 3) * h },
        ];
      }
    }
  }
};

/**
 * Convert vertices array to SVG polygon points string.
 */
export const verticesToSvgPoints = (vertices: Point[]): string =>
  vertices.map(({ x, y }) => `${x},${y}`).join(' ');
```

- [ ] **Step 4: Run vertex tests**

Run: `moon run plugin-tile:test -- src/geometry/vertices.test.ts`
Expected: PASS

- [ ] **Step 5: Write failing tests for visibleRange (src/geometry/viewport.test.ts)**

```typescript
//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { visibleRange } from './viewport';

describe('visibleRange', () => {
  test('square grid returns correct range', ({ expect }) => {
    const range = visibleRange({ x: 0, y: 0, width: 500, height: 500 }, 'square', 50);
    // Tiles at q=0..9, r=0..9 should be visible (500/50 = 10 tiles + 1 buffer each side).
    expect(range.qMin).toBeLessThanOrEqual(0);
    expect(range.qMax).toBeGreaterThanOrEqual(9);
    expect(range.rMin).toBeLessThanOrEqual(0);
    expect(range.rMax).toBeGreaterThanOrEqual(9);
  });

  test('panned viewport shifts range', ({ expect }) => {
    const range = visibleRange({ x: 250, y: 250, width: 500, height: 500 }, 'square', 50);
    expect(range.qMin).toBeGreaterThanOrEqual(4);
    expect(range.rMin).toBeGreaterThanOrEqual(4);
  });

  test('hex grid returns range', ({ expect }) => {
    const range = visibleRange({ x: 0, y: 0, width: 500, height: 500 }, 'hex', 50);
    expect(range.qMin).toBeDefined();
    expect(range.qMax).toBeGreaterThan(range.qMin);
  });
});
```

- [ ] **Step 6: Implement viewport.ts**

```typescript
//
// Copyright 2026 DXOS.org
//

import { type Tile } from '#types';

import { type ViewBox } from './types';

export interface VisibleRange {
  qMin: number;
  qMax: number;
  rMin: number;
  rMax: number;
}

/**
 * Calculate the range of axial coordinates visible within the given viewport.
 * Adds a 1-tile buffer on each side for smooth scrolling.
 */
export const visibleRange = (viewBox: ViewBox, gridType: Tile.GridType, tileSize: number): VisibleRange => {
  const buffer = 1;

  switch (gridType) {
    case 'square':
      return {
        qMin: Math.floor(viewBox.x / tileSize) - buffer,
        qMax: Math.ceil((viewBox.x + viewBox.width) / tileSize) + buffer,
        rMin: Math.floor(viewBox.y / tileSize) - buffer,
        rMax: Math.ceil((viewBox.y + viewBox.height) / tileSize) + buffer,
      };

    case 'hex': {
      const colWidth = tileSize * (3 / 2);
      const rowHeight = tileSize * Math.sqrt(3);
      return {
        qMin: Math.floor(viewBox.x / colWidth) - buffer,
        qMax: Math.ceil((viewBox.x + viewBox.width) / colWidth) + buffer,
        rMin: Math.floor(viewBox.y / rowHeight) - buffer,
        rMax: Math.ceil((viewBox.y + viewBox.height) / rowHeight) + buffer,
      };
    }

    case 'triangle': {
      const colWidth = tileSize / 2;
      const rowHeight = (tileSize * Math.sqrt(3)) / 2;
      return {
        qMin: Math.floor(viewBox.x / colWidth) - buffer,
        qMax: Math.ceil((viewBox.x + viewBox.width) / colWidth) + buffer,
        rMin: Math.floor(viewBox.y / rowHeight) - buffer,
        rMax: Math.ceil((viewBox.y + viewBox.height) / rowHeight) + buffer,
      };
    }
  }
};
```

- [ ] **Step 7: Run viewport tests**

Run: `moon run plugin-tile:test -- src/geometry/viewport.test.ts`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add packages/plugins/plugin-tile/src/geometry/
git commit -m "feat(plugin-tile): add vertex generation and viewport culling"
```

---

### Task 4: Grid Geometry — Measurement and Room Fitting

**Files:**
- Create: `src/geometry/measurement.ts`
- Create: `src/geometry/measurement.test.ts`

- [ ] **Step 1: Write failing tests (src/geometry/measurement.test.ts)**

```typescript
//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { gridToPhysical, fitToRoom } from './measurement';

describe('gridToPhysical', () => {
  test('square grid physical dimensions', ({ expect }) => {
    // 10 tiles * 50mm + 9 grout gaps * 2mm = 518mm.
    const dims = gridToPhysical(50, 2, 10, 10, 'square');
    expect(dims.widthMm).toBe(518);
    expect(dims.heightMm).toBe(518);
  });

  test('zero grout', ({ expect }) => {
    const dims = gridToPhysical(100, 0, 5, 5, 'square');
    expect(dims.widthMm).toBe(500);
    expect(dims.heightMm).toBe(500);
  });
});

describe('fitToRoom', () => {
  test('fits tiles to room dimensions', ({ expect }) => {
    // Room 1000mm × 1000mm, tiles 100mm, grout 2mm. Each tile+grout = 102mm.
    // floor(1000 / 102) = 9 tiles, but check last tile fits: 9*102 - 2 = 916 ≤ 1000. 10*102-2=1018>1000.
    const fit = fitToRoom(1000, 1000, 100, 2, 'square');
    expect(fit.gridWidth).toBe(9);
    expect(fit.gridHeight).toBe(9);
  });

  test('hex grid fitting', ({ expect }) => {
    const fit = fitToRoom(1000, 1000, 50, 2, 'hex');
    expect(fit.gridWidth).toBeGreaterThan(0);
    expect(fit.gridHeight).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `moon run plugin-tile:test -- src/geometry/measurement.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement measurement.ts**

```typescript
//
// Copyright 2026 DXOS.org
//

import { type Tile } from '#types';

/**
 * Calculate physical dimensions of a grid in millimeters.
 */
export const gridToPhysical = (
  tileSize: number,
  groutWidth: number,
  gridWidth: number,
  gridHeight: number,
  gridType: Tile.GridType,
): { widthMm: number; heightMm: number } => {
  switch (gridType) {
    case 'square': {
      const widthMm = gridWidth * tileSize + (gridWidth - 1) * groutWidth;
      const heightMm = gridHeight * tileSize + (gridHeight - 1) * groutWidth;
      return { widthMm, heightMm };
    }

    case 'hex': {
      // Flat-top hex: width = (3/2 * tileSize * (cols-1)) + 2*tileSize.
      const widthMm = tileSize * (3 / 2) * (gridWidth - 1) + 2 * tileSize + (gridWidth - 1) * groutWidth;
      const rowHeight = tileSize * Math.sqrt(3);
      const heightMm = rowHeight * gridHeight + (gridHeight - 1) * groutWidth;
      return { widthMm, heightMm };
    }

    case 'triangle': {
      const widthMm = (tileSize / 2) * (gridWidth + 1) + (gridWidth - 1) * groutWidth;
      const rowHeight = (tileSize * Math.sqrt(3)) / 2;
      const heightMm = rowHeight * gridHeight + (gridHeight - 1) * groutWidth;
      return { widthMm, heightMm };
    }
  }
};

/**
 * Calculate grid dimensions to fill a room of given size.
 */
export const fitToRoom = (
  roomWidth: number,
  roomHeight: number,
  tileSize: number,
  groutWidth: number,
  gridType: Tile.GridType,
): { gridWidth: number; gridHeight: number } => {
  switch (gridType) {
    case 'square': {
      const step = tileSize + groutWidth;
      const gridWidth = Math.floor((roomWidth + groutWidth) / step);
      const gridHeight = Math.floor((roomHeight + groutWidth) / step);
      return { gridWidth: Math.max(1, gridWidth), gridHeight: Math.max(1, gridHeight) };
    }

    case 'hex': {
      const colStep = tileSize * (3 / 2) + groutWidth;
      const rowStep = tileSize * Math.sqrt(3) + groutWidth;
      const gridWidth = Math.max(1, Math.floor((roomWidth - 2 * tileSize + groutWidth) / colStep) + 1);
      const gridHeight = Math.max(1, Math.floor((roomHeight + groutWidth) / rowStep));
      return { gridWidth, gridHeight };
    }

    case 'triangle': {
      const colStep = tileSize / 2 + groutWidth;
      const rowStep = (tileSize * Math.sqrt(3)) / 2 + groutWidth;
      const gridWidth = Math.max(1, Math.floor((roomWidth + groutWidth) / colStep));
      const gridHeight = Math.max(1, Math.floor((roomHeight + groutWidth) / rowStep));
      return { gridWidth, gridHeight };
    }
  }
};
```

- [ ] **Step 4: Run tests**

Run: `moon run plugin-tile:test -- src/geometry/measurement.test.ts`
Expected: PASS

- [ ] **Step 5: Update geometry/index.ts barrel to export all modules**

Ensure `src/geometry/index.ts` exports from `types`, `axial`, `vertices`, `viewport`, `measurement`.

- [ ] **Step 6: Run all geometry tests**

Run: `moon run plugin-tile:test -- src/geometry/`
Expected: All PASS

- [ ] **Step 7: Commit**

```bash
git add packages/plugins/plugin-tile/src/geometry/
git commit -m "feat(plugin-tile): add measurement and room fitting geometry"
```

---

### Task 5: Presets

**Files:**
- Create: `src/presets/presets.ts`
- Create: `src/presets/presets.test.ts`
- Create: `src/presets/index.ts`

- [ ] **Step 1: Write failing tests (src/presets/presets.test.ts)**

```typescript
//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { applyPreset, listPresets } from './presets';

describe('listPresets', () => {
  test('returns available presets', ({ expect }) => {
    const presets = listPresets();
    expect(presets.length).toBeGreaterThanOrEqual(4);
    expect(presets.map((p) => p.key)).toContain('checkerboard');
    expect(presets.map((p) => p.key)).toContain('herringbone');
  });
});

describe('applyPreset', () => {
  test('checkerboard fills alternating cells', ({ expect }) => {
    const cells = applyPreset('checkerboard', 'square', 4, 4, ['#000', '#fff']);
    expect(Object.keys(cells)).toHaveLength(16);
    expect(cells['0,0']).toBe('#000');
    expect(cells['1,0']).toBe('#fff');
    expect(cells['0,1']).toBe('#fff');
    expect(cells['1,1']).toBe('#000');
  });

  test('herringbone generates cells', ({ expect }) => {
    const cells = applyPreset('herringbone', 'square', 6, 6, ['#c0392b', '#2c3e50']);
    expect(Object.keys(cells).length).toBeGreaterThan(0);
  });

  test('honeycomb works on hex grid', ({ expect }) => {
    const cells = applyPreset('honeycomb', 'hex', 5, 5, ['#f39c12', '#e74c3c', '#3498db']);
    expect(Object.keys(cells).length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `moon run plugin-tile:test -- src/presets/presets.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement presets.ts**

```typescript
//
// Copyright 2026 DXOS.org
//

import { type Tile } from '#types';

export interface Preset {
  key: string;
  name: string;
  gridTypes: Tile.GridType[];
}

export const listPresets = (): Preset[] => [
  { key: 'checkerboard', name: 'Checkerboard', gridTypes: ['square', 'hex', 'triangle'] },
  { key: 'herringbone', name: 'Herringbone', gridTypes: ['square'] },
  { key: 'honeycomb', name: 'Honeycomb', gridTypes: ['hex'] },
  { key: 'diamond', name: 'Diamond', gridTypes: ['square'] },
  { key: 'basketweave', name: 'Basketweave', gridTypes: ['square'] },
  { key: 'pinwheel', name: 'Pinwheel', gridTypes: ['triangle'] },
];

/**
 * Generate a cells map for a named preset pattern.
 */
export const applyPreset = (
  preset: string,
  gridType: Tile.GridType,
  gridWidth: number,
  gridHeight: number,
  colors: string[],
): Record<string, string> => {
  const cells: Record<string, string> = {};
  const color = (index: number) => colors[index % colors.length];

  switch (preset) {
    case 'checkerboard':
      for (let r = 0; r < gridHeight; r++) {
        for (let q = 0; q < gridWidth; q++) {
          cells[`${q},${r}`] = color((q + r) % 2);
        }
      }
      break;

    case 'herringbone':
      for (let r = 0; r < gridHeight; r++) {
        for (let q = 0; q < gridWidth; q++) {
          const block = Math.floor(q / 2) + Math.floor(r / 2);
          cells[`${q},${r}`] = color((block + (r % 2)) % 2);
        }
      }
      break;

    case 'honeycomb':
      for (let r = 0; r < gridHeight; r++) {
        for (let q = 0; q < gridWidth; q++) {
          // Three-color honeycomb based on modular arithmetic.
          const index = ((q % 3) + (r % 3)) % 3;
          cells[`${q},${r}`] = color(index);
        }
      }
      break;

    case 'diamond':
      for (let r = 0; r < gridHeight; r++) {
        for (let q = 0; q < gridWidth; q++) {
          const cx = gridWidth / 2;
          const cy = gridHeight / 2;
          const dist = Math.abs(q - cx) + Math.abs(r - cy);
          cells[`${q},${r}`] = color(Math.floor(dist) % colors.length);
        }
      }
      break;

    case 'basketweave':
      for (let r = 0; r < gridHeight; r++) {
        for (let q = 0; q < gridWidth; q++) {
          const blockQ = Math.floor(q / 2);
          const blockR = Math.floor(r / 2);
          const inBlock = (q % 2) + (r % 2);
          cells[`${q},${r}`] = color((blockQ + blockR + (inBlock > 0 ? 1 : 0)) % 2);
        }
      }
      break;

    case 'pinwheel':
      for (let r = 0; r < gridHeight; r++) {
        for (let q = 0; q < gridWidth; q++) {
          const section = (q + r) % 4;
          cells[`${q},${r}`] = color(section % colors.length);
        }
      }
      break;
  }

  return cells;
};
```

- [ ] **Step 4: Create src/presets/index.ts**

```typescript
//
// Copyright 2026 DXOS.org
//

export * from './presets';
```

- [ ] **Step 5: Run tests**

Run: `moon run plugin-tile:test -- src/presets/presets.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/plugins/plugin-tile/src/presets/
git commit -m "feat(plugin-tile): add preset tessellation patterns"
```

---

### Task 6: React Components — TileCell and TileGrid

**Files:**
- Create: `src/components/index.ts`
- Create: `src/components/TileCell/index.ts`
- Create: `src/components/TileCell/TileCell.tsx`
- Create: `src/components/TileGrid/index.ts`
- Create: `src/components/TileGrid/TileGrid.tsx`

- [ ] **Step 1: Create TileCell component**

`src/components/TileCell/TileCell.tsx`:
```tsx
//
// Copyright 2026 DXOS.org
//

import React, { useCallback } from 'react';

import { type Tile } from '#types';
import { type Coord, tileVertices, verticesToSvgPoints } from '#geometry';

export type TileCellProps = {
  coord: Coord;
  gridType: Tile.GridType;
  tileSize: number;
  color?: string;
  hovered?: boolean;
  groutWidth: number;
  onClick?: (coord: Coord) => void;
  onHover?: (coord: Coord) => void;
};

export const TileCell = ({ coord, gridType, tileSize, color, hovered, groutWidth, onClick, onHover }: TileCellProps) => {
  const vertices = tileVertices(coord.q, coord.r, gridType, tileSize);
  const points = verticesToSvgPoints(vertices);

  const handleClick = useCallback(() => onClick?.(coord), [onClick, coord]);
  const handleMouseEnter = useCallback(() => onHover?.(coord), [onHover, coord]);

  return (
    <polygon
      points={points}
      fill={color ?? 'transparent'}
      stroke={hovered ? '#60a5fa' : 'rgba(128,128,128,0.3)'}
      strokeWidth={groutWidth}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      className='cursor-pointer'
    />
  );
};
```

`src/components/TileCell/index.ts`:
```typescript
//
// Copyright 2026 DXOS.org
//

export * from './TileCell';
```

- [ ] **Step 2: Create TileGrid component**

`src/components/TileGrid/TileGrid.tsx`:
```tsx
//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { type Tile } from '#types';
import { type Coord, type ViewBox, visibleRange } from '#geometry';

import { TileCell } from '../TileCell';

export type TileGridProps = {
  gridType: Tile.GridType;
  gridWidth: number;
  gridHeight: number;
  tileSize: number;
  groutWidth: number;
  cells: Record<string, string>;
  viewBox: ViewBox;
  hoveredCell?: Coord;
  onClick?: (coord: Coord) => void;
  onHover?: (coord: Coord) => void;
};

export const TileGrid = ({
  gridType,
  gridWidth,
  gridHeight,
  tileSize,
  groutWidth,
  cells,
  viewBox,
  hoveredCell,
  onClick,
  onHover,
}: TileGridProps) => {
  const range = useMemo(() => visibleRange(viewBox, gridType, tileSize), [viewBox, gridType, tileSize]);

  const visibleCells = useMemo(() => {
    const result: Coord[] = [];
    const qMin = Math.max(0, range.qMin);
    const qMax = Math.min(gridWidth - 1, range.qMax);
    const rMin = Math.max(0, range.rMin);
    const rMax = Math.min(gridHeight - 1, range.rMax);

    for (let r = rMin; r <= rMax; r++) {
      for (let q = qMin; q <= qMax; q++) {
        result.push({ q, r });
      }
    }
    return result;
  }, [range, gridWidth, gridHeight]);

  return (
    <g>
      {visibleCells.map(({ q, r }) => (
        <TileCell
          key={`${q},${r}`}
          coord={{ q, r }}
          gridType={gridType}
          tileSize={tileSize}
          groutWidth={groutWidth}
          color={cells[`${q},${r}`]}
          hovered={hoveredCell?.q === q && hoveredCell?.r === r}
          onClick={onClick}
          onHover={onHover}
        />
      ))}
    </g>
  );
};
```

`src/components/TileGrid/index.ts`:
```typescript
//
// Copyright 2026 DXOS.org
//

export * from './TileGrid';
```

- [ ] **Step 3: Create components barrel (src/components/index.ts)**

```typescript
//
// Copyright 2026 DXOS.org
//

export * from './TileCell';
export * from './TileGrid';
export * from './TileCanvas';
```

Note: TileCanvas not yet created — comment out until Task 7. Export only TileCell and TileGrid for now.

- [ ] **Step 4: Build to verify components compile**

Run: `moon run plugin-tile:build`

- [ ] **Step 5: Commit**

```bash
git add packages/plugins/plugin-tile/src/components/
git commit -m "feat(plugin-tile): add TileCell and TileGrid components"
```

---

### Task 7: TileCanvas with Pan/Zoom

**Files:**
- Create: `src/components/TileCanvas/index.ts`
- Create: `src/components/TileCanvas/TileCanvas.tsx`
- Create: `src/components/TileCanvas/TileCanvas.stories.tsx`

- [ ] **Step 1: Create TileCanvas component**

`src/components/TileCanvas/TileCanvas.tsx`:
```tsx
//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useRef, useState } from 'react';

import { type Tile } from '#types';
import { type Coord, type ViewBox, axialToPixel, gridToPhysical } from '#geometry';

import { TileGrid } from '../TileGrid';

export type TileCanvasProps = {
  pattern: Tile.Pattern;
  activeColor: string;
  onCellPaint: (coord: Coord, color: string) => void;
  onCellClear: (coord: Coord) => void;
};

const INITIAL_PADDING = 50;

export const TileCanvas = ({ pattern, activeColor, onCellPaint, onCellClear }: TileCanvasProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredCell, setHoveredCell] = useState<Coord | undefined>();
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const { tileSize, gridType, gridWidth, gridHeight, groutWidth } = pattern;
  const physical = gridToPhysical(tileSize, groutWidth, gridWidth, gridHeight, gridType);

  const [viewBox, setViewBox] = useState<ViewBox>({
    x: -INITIAL_PADDING,
    y: -INITIAL_PADDING,
    width: physical.widthMm + INITIAL_PADDING * 2,
    height: physical.heightMm + INITIAL_PADDING * 2,
  });

  const handleCellClick = useCallback(
    (coord: Coord) => {
      const key = `${coord.q},${coord.r}`;
      if (pattern.cells[key] === activeColor) {
        onCellClear(coord);
      } else {
        onCellPaint(coord, activeColor);
      }
    },
    [pattern.cells, activeColor, onCellPaint, onCellClear],
  );

  const handleWheel = useCallback(
    (event: React.WheelEvent) => {
      event.preventDefault();
      const scale = event.deltaY > 0 ? 1.1 : 0.9;
      setViewBox((prev) => {
        const cx = prev.x + prev.width / 2;
        const cy = prev.y + prev.height / 2;
        const newWidth = prev.width * scale;
        const newHeight = prev.height * scale;
        return {
          x: cx - newWidth / 2,
          y: cy - newHeight / 2,
          width: newWidth,
          height: newHeight,
        };
      });
    },
    [],
  );

  const handleMouseDown = useCallback(
    (event: React.MouseEvent) => {
      if (event.button === 1 || event.shiftKey) {
        setIsPanning(true);
        setPanStart({ x: event.clientX, y: event.clientY });
        event.preventDefault();
      }
    },
    [],
  );

  const handleMouseMove = useCallback(
    (event: React.MouseEvent) => {
      if (!isPanning || !svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const scaleX = viewBox.width / rect.width;
      const scaleY = viewBox.height / rect.height;
      const dx = (event.clientX - panStart.x) * scaleX;
      const dy = (event.clientY - panStart.y) * scaleY;
      setViewBox((prev) => ({ ...prev, x: prev.x - dx, y: prev.y - dy }));
      setPanStart({ x: event.clientX, y: event.clientY });
    },
    [isPanning, panStart, viewBox],
  );

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const viewBoxStr = `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`;

  // Room boundary overlay.
  const showRoom = pattern.width != null && pattern.height != null;

  return (
    <svg
      ref={svgRef}
      viewBox={viewBoxStr}
      className='grow'
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <TileGrid
        gridType={gridType}
        gridWidth={gridWidth}
        gridHeight={gridHeight}
        tileSize={tileSize}
        groutWidth={groutWidth}
        cells={pattern.cells}
        viewBox={viewBox}
        hoveredCell={hoveredCell}
        onClick={handleCellClick}
        onHover={setHoveredCell}
      />

      {/* Room boundary */}
      {showRoom && (
        <rect
          x={0}
          y={0}
          width={pattern.width}
          height={pattern.height}
          fill='none'
          stroke='#ef4444'
          strokeWidth={2}
          strokeDasharray='8,4'
          pointerEvents='none'
        />
      )}

      {/* Measurement overlay */}
      {showRoom && (
        <g pointerEvents='none'>
          <text x={pattern.width! / 2} y={-10} textAnchor='middle' fill='#94a3b8' fontSize={12}>
            {pattern.width}mm
          </text>
          <text x={-10} y={pattern.height! / 2} textAnchor='end' fill='#94a3b8' fontSize={12} transform={`rotate(-90, -10, ${pattern.height! / 2})`}>
            {pattern.height}mm
          </text>
        </g>
      )}
    </svg>
  );
};
```

`src/components/TileCanvas/index.ts`:
```typescript
//
// Copyright 2026 DXOS.org
//

export * from './TileCanvas';
```

- [ ] **Step 2: Create storybook (src/components/TileCanvas/TileCanvas.stories.tsx)**

```tsx
//
// Copyright 2026 DXOS.org
//

import React, { useState } from 'react';

import { type Coord } from '#geometry';

import { TileCanvas } from './TileCanvas';

export default {
  title: 'plugin-tile/TileCanvas',
  component: TileCanvas,
};

const makePattern = (gridType: 'square' | 'triangle' | 'hex') => ({
  name: 'Test pattern',
  gridType,
  gridWidth: 10,
  gridHeight: 10,
  tileSize: 50,
  groutWidth: 2,
  repeatMode: 'single' as const,
  cells: {} as Record<string, string>,
});

export const Square = () => {
  const [cells, setCells] = useState<Record<string, string>>({});
  const pattern = { ...makePattern('square'), cells };

  return (
    <div style={{ width: '100%', height: '600px', display: 'flex' }}>
      <TileCanvas
        pattern={pattern as any}
        activeColor='#3b82f6'
        onCellPaint={(coord: Coord, color: string) => {
          setCells((prev) => ({ ...prev, [`${coord.q},${coord.r}`]: color }));
        }}
        onCellClear={(coord: Coord) => {
          setCells((prev) => {
            const next = { ...prev };
            delete next[`${coord.q},${coord.r}`];
            return next;
          });
        }}
      />
    </div>
  );
};

export const Hex = () => {
  const [cells, setCells] = useState<Record<string, string>>({});
  const pattern = { ...makePattern('hex'), cells };

  return (
    <div style={{ width: '100%', height: '600px', display: 'flex' }}>
      <TileCanvas
        pattern={pattern as any}
        activeColor='#f59e0b'
        onCellPaint={(coord: Coord, color: string) => {
          setCells((prev) => ({ ...prev, [`${coord.q},${coord.r}`]: color }));
        }}
        onCellClear={(coord: Coord) => {
          setCells((prev) => {
            const next = { ...prev };
            delete next[`${coord.q},${coord.r}`];
            return next;
          });
        }}
      />
    </div>
  );
};

export const Triangle = () => {
  const [cells, setCells] = useState<Record<string, string>>({});
  const pattern = { ...makePattern('triangle'), cells };

  return (
    <div style={{ width: '100%', height: '600px', display: 'flex' }}>
      <TileCanvas
        pattern={pattern as any}
        activeColor='#10b981'
        onCellPaint={(coord: Coord, color: string) => {
          setCells((prev) => ({ ...prev, [`${coord.q},${coord.r}`]: color }));
        }}
        onCellClear={(coord: Coord) => {
          setCells((prev) => {
            const next = { ...prev };
            delete next[`${coord.q},${coord.r}`];
            return next;
          });
        }}
      />
    </div>
  );
};
```

- [ ] **Step 3: Update components/index.ts to include TileCanvas**

```typescript
//
// Copyright 2026 DXOS.org
//

export * from './TileCell';
export * from './TileGrid';
export * from './TileCanvas';
```

- [ ] **Step 4: Build to verify**

Run: `moon run plugin-tile:build`

- [ ] **Step 5: Commit**

```bash
git add packages/plugins/plugin-tile/src/components/
git commit -m "feat(plugin-tile): add TileCanvas with pan/zoom and storybook"
```

---

### Task 8: Containers — TileArticle and TileCard

**Files:**
- Create: `src/containers/index.ts`
- Create: `src/containers/TileArticle/index.ts`
- Create: `src/containers/TileArticle/TileArticle.tsx`
- Create: `src/containers/TileCard/index.ts`
- Create: `src/containers/TileCard/TileCard.tsx`

- [ ] **Step 1: Create TileArticle container**

`src/containers/TileArticle/TileArticle.tsx`:
```tsx
//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useState } from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { Panel } from '@dxos/react-ui';

import { TileCanvas } from '#components';
import { type Coord, fitToRoom } from '#geometry';
import { type Tile } from '#types';

export type TileArticleProps = AppSurface.ObjectArticleProps<Tile.Pattern>;

const DEFAULT_COLOR = '#3b82f6';

export const TileArticle = ({ role, subject: pattern }: TileArticleProps) => {
  const [activeColor, setActiveColor] = useState(DEFAULT_COLOR);

  const handleCellPaint = useCallback(
    (coord: Coord, color: string) => {
      Obj.change(pattern, (draft) => {
        draft.cells[`${coord.q},${coord.r}`] = color;
      });
    },
    [pattern],
  );

  const handleCellClear = useCallback(
    (coord: Coord) => {
      Obj.change(pattern, (draft) => {
        delete draft.cells[`${coord.q},${coord.r}`];
      });
    },
    [pattern],
  );

  return (
    <Panel.Root role={role} classNames='flex flex-col grow overflow-hidden'>
      <TileCanvas
        pattern={pattern}
        activeColor={activeColor}
        onCellPaint={handleCellPaint}
        onCellClear={handleCellClear}
      />
    </Panel.Root>
  );
};
```

`src/containers/TileArticle/index.ts`:
```typescript
//
// Copyright 2026 DXOS.org
//

export { TileArticle as default } from './TileArticle';
```

- [ ] **Step 2: Create TileCard container**

`src/containers/TileCard/TileCard.tsx`:
```tsx
//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';

import { type Tile } from '#types';
import { tileVertices, verticesToSvgPoints, gridToPhysical } from '#geometry';

export type TileCardProps = AppSurface.ObjectCardProps<Tile.Pattern>;

export const TileCard = ({ subject: pattern }: TileCardProps) => {
  const { gridType, gridWidth, gridHeight, tileSize, groutWidth, cells } = pattern;
  const physical = gridToPhysical(tileSize, groutWidth, gridWidth, gridHeight, gridType);

  const polygons = useMemo(() => {
    const result: Array<{ key: string; points: string; color: string }> = [];
    for (const [key, color] of Object.entries(cells)) {
      const [q, r] = key.split(',').map(Number);
      const vertices = tileVertices(q, r, gridType, tileSize);
      result.push({ key, points: verticesToSvgPoints(vertices), color });
    }
    return result;
  }, [cells, gridType, tileSize]);

  return (
    <svg viewBox={`-10 -10 ${physical.widthMm + 20} ${physical.heightMm + 20}`} className='w-full h-full'>
      {polygons.map(({ key, points, color }) => (
        <polygon key={key} points={points} fill={color} stroke='rgba(128,128,128,0.3)' strokeWidth={groutWidth} />
      ))}
    </svg>
  );
};
```

`src/containers/TileCard/index.ts`:
```typescript
//
// Copyright 2026 DXOS.org
//

export { TileCard as default } from './TileCard';
```

- [ ] **Step 3: Create containers/index.ts with lazy exports**

```typescript
//
// Copyright 2026 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export const TileArticle: ComponentType<any> = lazy(() => import('./TileArticle'));
export const TileCard: ComponentType<any> = lazy(() => import('./TileCard'));
```

- [ ] **Step 4: Build to verify**

Run: `moon run plugin-tile:build`

- [ ] **Step 5: Commit**

```bash
git add packages/plugins/plugin-tile/src/containers/
git commit -m "feat(plugin-tile): add TileArticle and TileCard containers"
```

---

### Task 9: Capabilities and Plugin Definition

**Files:**
- Create: `src/capabilities/index.ts`
- Create: `src/capabilities/react-surface.tsx`
- Create: `src/operations/index.ts`
- Create: `src/operations/definitions.ts`
- Create: `src/operations/create.ts`
- Create: `src/operations/apply-preset.ts`
- Create: `src/TilePlugin.tsx`

- [ ] **Step 1: Create react-surface capability**

`src/capabilities/react-surface.tsx`:
```tsx
//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';

import { TileArticle, TileCard } from '#containers';
import { Tile } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'tile-pattern',
        role: ['article', 'section'],
        filter: AppSurface.objectArticle(Tile.Pattern),
        component: ({ data, role }) => (
          <TileArticle role={role} subject={data.subject} attendableId={data.attendableId} />
        ),
      }),
      Surface.create({
        id: 'tile-pattern-card',
        role: ['card--content'],
        filter: AppSurface.objectCard(Tile.Pattern),
        component: ({ data, role }) => <TileCard role={role} subject={data.subject} />,
      }),
    ]),
  ),
);
```

`src/capabilities/index.ts`:
```typescript
//
// Copyright 2026 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const ReactSurface = Capability.lazy('ReactSurface', () => import('./react-surface'));
```

- [ ] **Step 2: Create operation definitions**

`src/operations/definitions.ts`:
```typescript
//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Database } from '@dxos/echo';
import { Operation } from '@dxos/operation';

import { Tile } from '#types';

export const Create = Operation.make({
  meta: {
    key: 'org.dxos.function.tile.create',
    name: 'Create Tile Pattern',
    description: 'Creates a new tile pattern with grid configuration.',
  },
  input: Schema.Struct({
    name: Schema.optional(Schema.String),
    gridType: Schema.optional(Tile.GridType),
    gridWidth: Schema.optional(Schema.Number),
    gridHeight: Schema.optional(Schema.Number),
    tileSize: Schema.optional(Schema.Number),
    groutWidth: Schema.optional(Schema.Number),
  }),
  output: Tile.Pattern,
  services: [Database.Service],
});

export const ApplyPreset = Operation.make({
  meta: {
    key: 'org.dxos.function.tile.apply-preset',
    name: 'Apply Preset',
    description: 'Fills a tile pattern with a named tessellation preset.',
  },
  input: Schema.Struct({
    pattern: Tile.Pattern,
    preset: Schema.String,
    colors: Schema.Array(Schema.String),
  }),
  output: Tile.Pattern,
  services: [Database.Service],
});
```

- [ ] **Step 3: Create operation handlers**

`src/operations/create.ts`:
```typescript
//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database } from '@dxos/echo';
import { Operation } from '@dxos/operation';

import { Tile } from '#types';

import { Create } from './definitions';

const handler: Operation.WithHandler<typeof Create> = Create.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ name, gridType, gridWidth, gridHeight, tileSize, groutWidth }) {
      const pattern = Tile.make({ name, gridType, gridWidth, gridHeight, tileSize, groutWidth });
      return yield* Database.add(pattern);
    }),
  ),
);

export default handler;
```

`src/operations/apply-preset.ts`:
```typescript
//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Obj } from '@dxos/echo';
import { Operation } from '@dxos/operation';

import { applyPreset as generatePreset } from '#presets';

import { ApplyPreset } from './definitions';

const handler: Operation.WithHandler<typeof ApplyPreset> = ApplyPreset.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ pattern, preset, colors }) {
      const cells = generatePreset(preset, pattern.gridType, pattern.gridWidth, pattern.gridHeight, colors);
      Obj.change(pattern, (draft) => {
        draft.cells = cells;
      });
      return pattern;
    }),
  ),
);

export default handler;
```

`src/operations/index.ts`:
```typescript
//
// Copyright 2026 DXOS.org
//

import { OperationHandlerSet } from '@dxos/operation';

export * from './definitions';

export const handlers = OperationHandlerSet.lazy(() => import('./handler-set'));
```

Note: You'll need a `handler-set.ts` that aggregates:
```typescript
//
// Copyright 2026 DXOS.org
//

import { OperationHandlerSet } from '@dxos/operation';

import create from './create';
import applyPreset from './apply-preset';

export default OperationHandlerSet.from([create, applyPreset]);
```

- [ ] **Step 4: Create TilePlugin.tsx**

```typescript
//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { Annotation } from '@dxos/echo';
import { Operation } from '@dxos/operation';
import { SpaceOperation } from '@dxos/plugin-space/operations';
import { type CreateObject } from '@dxos/plugin-space/types';

import { ReactSurface } from '#capabilities';
import { meta } from '#meta';
import { Tile } from '#types';

import { translations } from './translations';

export const TilePlugin = Plugin.define(meta).pipe(
  AppPlugin.addMetadataModule({
    metadata: {
      id: Tile.Pattern.typename,
      metadata: {
        icon: Annotation.IconAnnotation.get(Tile.Pattern).pipe(Option.getOrThrow).icon,
        iconHue: Annotation.IconAnnotation.get(Tile.Pattern).pipe(Option.getOrThrow).hue ?? 'white',
        createObject: ((props, options) =>
          Effect.gen(function* () {
            const object = Tile.make(props);
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
  AppPlugin.addSchemaModule({ schema: [Tile.Pattern] }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.make,
);
```

- [ ] **Step 5: Build to verify everything compiles**

Run: `moon run plugin-tile:build`

- [ ] **Step 6: Commit**

```bash
git add packages/plugins/plugin-tile/src/capabilities/ packages/plugins/plugin-tile/src/operations/ packages/plugins/plugin-tile/src/TilePlugin.tsx
git commit -m "feat(plugin-tile): add capabilities, operations, and plugin definition"
```

---

### Task 10: Register Plugin with Composer App

**Files:**
- Modify: `packages/apps/composer-app/package.json` — add `@dxos/plugin-tile` dependency
- Modify: `packages/apps/composer-app/src/plugin-defs.tsx` — import and register TilePlugin

- [ ] **Step 1: Add dependency**

Run: `pnpm add --filter "@dxos/composer-app" "@dxos/plugin-tile@workspace:*"`

- [ ] **Step 2: Import and register in plugin-defs.tsx**

Add import (in alphabetical position near other plugin imports):
```typescript
import { TilePlugin } from '@dxos/plugin-tile';
```

Add to plugin array (in alphabetical position):
```typescript
TilePlugin(),
```

- [ ] **Step 3: Run pnpm install to update lockfile**

Run: `pnpm install`

- [ ] **Step 4: Build composer-app to verify**

Run: `moon run composer-app:build`

- [ ] **Step 5: Commit**

```bash
git add packages/apps/composer-app/package.json packages/apps/composer-app/src/plugin-defs.tsx pnpm-lock.yaml
git commit -m "feat(plugin-tile): register TilePlugin with composer-app"
```

---

### Task 11: Lint, Full Build, and Final Verification

- [ ] **Step 1: Run linter with fix**

Run: `moon run plugin-tile:lint -- --fix`

- [ ] **Step 2: Run all plugin-tile tests**

Run: `moon run plugin-tile:test`
Expected: All geometry and preset tests pass

- [ ] **Step 3: Full build**

Run: `moon run plugin-tile:build`
Expected: Clean build

- [ ] **Step 4: Fix any issues found**

- [ ] **Step 5: Final commit if any lint/fix changes**

```bash
git add -A packages/plugins/plugin-tile/
git commit -m "chore(plugin-tile): lint fixes and cleanup"
```
