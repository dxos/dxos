# react-ui-graph v2 — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the minimum slice of the v2 graph engine (per [DESIGN.md](./DESIGN.md) §Phase 1) that lets us evaluate developer experience: a headless `@dxos/graph-engine` with a Canvas backend, force projector, straight router, three tools, HTML overlay layer, and a `react-ui-graph/src/v2/` React frontend with a storybook example.

**Architecture:** New `@dxos/graph-engine` package at `packages/common/graph-engine/` houses the framework-agnostic engine, registry, projector/router contracts, tween service, tools, and Canvas backend. Existing `@dxos/react-ui-graph` gains a v2 subtree under `src/v2/` that wraps the engine in React (`GraphRoot`, `GraphSurface`, `HtmlOverlayLayer`). v1 untouched.

**Tech Stack:** TypeScript, d3 + d3-force (catalogued), `@dxos/graph` `ReactiveGraphModel`, `@effect-atom/atom-react`, Canvas 2D, React, Vitest, Storybook.

---

## File Structure

### New package `@dxos/graph-engine` (`packages/common/graph-engine/`)

| Path                                                               | Responsibility                                                                              |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| `package.json` / `moon.yml` / `tsconfig.json` / `vitest.config.ts` | Package boilerplate (mirrors `@dxos/graph`).                                                |
| `src/index.ts`                                                     | Public barrel.                                                                              |
| `src/types.ts`                                                     | `Point`, `Size`, `Rect`, `LayoutNode`, `LayoutEdge`, `LayoutGraph`, `SemanticPointerEvent`. |
| `src/draw/path.ts`                                                 | Backend-neutral `Path` primitive + `createPath()`.                                          |
| `src/draw/draw-context.ts`                                         | `DrawContext` interface used by handler `draw()` calls.                                     |
| `src/viewport.ts`                                                  | `Viewport` class — size, transform, world↔screen, `frame` event.                            |
| `src/tween/tween-service.ts`                                       | `TweenService` — single d3-timer; `setTarget()`, per-entity tweens.                         |
| `src/registry/handlers.ts`                                         | `NodeHandler`, `EdgeHandler`, `NodeIsland`, `EdgeIsland` types.                             |
| `src/registry/type-registry.ts`                                    | `TypeRegistry` impl with `'default'` fallback.                                              |
| `src/registry/default-handlers.ts`                                 | Built-in `defaultNodeHandler` and `defaultEdgeHandler`.                                     |
| `src/projector/projector.ts`                                       | `Projector` abstract base.                                                                  |
| `src/projector/force-projector.ts`                                 | Port of v1 `GraphForceProjector` against new contract.                                      |
| `src/router/router.ts`                                             | `EdgeRouter` interface + `EdgeRouterId` union.                                              |
| `src/router/straight-router.ts`                                    | `StraightRouter`.                                                                           |
| `src/tool/tool.ts`                                                 | `Tool` interface, `SemanticPointerEvent`.                                                   |
| `src/tool/hover-tool.ts`                                           | `HoverTool`.                                                                                |
| `src/tool/select-tool.ts`                                          | `SelectTool`.                                                                               |
| `src/tool/zoom-tool.ts`                                            | `ZoomTool` (d3-zoom).                                                                       |
| `src/backend/render-backend.ts`                                    | `RenderBackend` interface.                                                                  |
| `src/backend/canvas/canvas-path.ts`                                | Canvas `Path2D` impl of `Path`.                                                             |
| `src/backend/canvas/canvas-draw-context.ts`                        | Canvas `DrawContext` impl.                                                                  |
| `src/backend/canvas/canvas-backend.ts`                             | `CanvasBackend` — driver for a `<canvas>` element.                                          |
| `src/model/model-adapter.ts`                                       | `subscribeModel(model, cb)` — wraps `ReactiveGraphModel`.                                   |
| `src/engine.ts`                                                    | `Engine` class — wires registry, projector, tween, tools, viewport, backend, model.         |

### Updates to `@dxos/react-ui-graph` (`packages/ui/react-ui-graph/`)

| Path                                | Responsibility                                                                                                              |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `src/v2/index.ts`                   | v2 barrel — re-exported from package root via `src/index.ts`.                                                               |
| `src/v2/context.ts`                 | `EngineContext` React context + `useEngineContext()`.                                                                       |
| `src/v2/hooks/use-engine.ts`        | `useEngine(opts)` factory.                                                                                                  |
| `src/v2/hooks/use-viewport.ts`      | Subscribes to viewport changes, returns scale/size/transform.                                                               |
| `src/v2/hooks/use-selection.ts`     | Selection passthrough hook (Phase 1: read-only mirror).                                                                     |
| `src/v2/GraphRoot.tsx`              | Provides `EngineContext`, owns canvas/overlay resize observer.                                                              |
| `src/v2/GraphSurface.tsx`           | Mounts `<canvas>`, wires `CanvasBackend`, forwards pointer events to tools.                                                 |
| `src/v2/HtmlOverlayLayer.tsx`       | Mounts overlay div; per-island wrapper with imperative transform.                                                           |
| `src/v2/stories/Phase1.stories.tsx` | Storybook: force layout + island popover example.                                                                           |
| `src/index.ts`                      | Append `export * from './v2';` (namespaced re-export not used — v2 lives in its own subpath import path via index for now). |
| `package.json`                      | Add `@dxos/graph-engine: workspace:*` dependency.                                                                           |

---

## Conventions

- Use single quotes, arrow functions, ES `#private` for new code.
- Tests live next to the module as `module.test.ts`.
- Tests use `describe`/`test('foo', ({ expect }) => ...)` — never `it`.
- Public functions get one-line JSDoc ending in a period.
- Imports grouped builtin → external → @dxos → relative.
- All commits sign off with `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`.

---

## Task 0: Verify environment

- [ ] **Step 1: Confirm worktree and branch**

Run: `git status && git branch --show-current`
Expected: clean working tree on `claude/kind-shirley-2ccca0` (or current Phase-1 branch).

- [ ] **Step 2: Sanity-check existing v1 builds**

Run: `moon run react-ui-graph:build --quiet 2>&1 | tail -20`
Expected: build succeeds (warnings about DEPOT_TOKEN are ignorable).

---

## Task 1: Scaffold `@dxos/graph-engine` package

**Files:**

- Create: `packages/common/graph-engine/package.json`
- Create: `packages/common/graph-engine/tsconfig.json`
- Create: `packages/common/graph-engine/moon.yml`
- Create: `packages/common/graph-engine/vitest.config.ts`
- Create: `packages/common/graph-engine/src/index.ts`
- Create: `packages/common/graph-engine/README.md`
- Modify: `pnpm-workspace.yaml` (verify glob already picks up `packages/common/*`; preserve comments).

- [ ] **Step 1: Create package.json**

```json
{
  "name": "@dxos/graph-engine",
  "version": "0.8.3",
  "description": "Framework-agnostic graph rendering engine (registry, projector, tween, backends).",
  "private": true,
  "homepage": "https://dxos.org",
  "bugs": "https://github.com/dxos/dxos/issues",
  "repository": { "type": "git", "url": "https://github.com/dxos/dxos" },
  "license": "FSL-1.1-Apache-2.0",
  "author": "DXOS.org",
  "sideEffects": false,
  "type": "module",
  "exports": {
    ".": {
      "source": "./src/index.ts",
      "types": "./dist/types/src/index.d.ts",
      "browser": "./dist/lib/browser/index.mjs",
      "node": "./dist/lib/node-esm/index.mjs"
    }
  },
  "types": "dist/types/src/index.d.ts",
  "files": ["dist", "src"],
  "dependencies": {
    "@dxos/async": "workspace:*",
    "@dxos/debug": "workspace:*",
    "@dxos/graph": "workspace:*",
    "@dxos/invariant": "workspace:*",
    "@dxos/log": "workspace:*",
    "@dxos/util": "workspace:*",
    "@effect-atom/atom-react": "catalog:",
    "d3": "catalog:",
    "d3-force": "catalog:"
  },
  "devDependencies": {
    "@types/d3": "catalog:"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "extends": "../../../tsconfig.base.json",
  "compilerOptions": {
    "lib": ["ESNext", "DOM"],
    "types": ["node"]
  },
  "include": ["src/**/*.ts"],
  "references": [
    { "path": "../async" },
    { "path": "../debug" },
    { "path": "../graph" },
    { "path": "../invariant" },
    { "path": "../log" },
    { "path": "../util" }
  ]
}
```

- [ ] **Step 3: Create moon.yml**

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
```

- [ ] **Step 4: Create vitest.config.ts**

```ts
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

- [ ] **Step 5: Create empty barrel**

`src/index.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

export {};
```

- [ ] **Step 6: README placeholder**

`README.md`:

```markdown
# @dxos/graph-engine

Framework-agnostic graph rendering engine. See `packages/ui/react-ui-graph/docs/DESIGN.md`.
```

- [ ] **Step 7: Install and verify package wires up**

Run: `pnpm install --filter @dxos/graph-engine`
Expected: install succeeds; `pnpm -r --filter @dxos/graph-engine exec pwd` prints the package directory.

Run: `moon run graph-engine:build --quiet 2>&1 | tail -20`
Expected: empty build succeeds.

- [ ] **Step 8: Commit**

```bash
git add packages/common/graph-engine pnpm-lock.yaml
git commit -m "feat(graph-engine): scaffold package

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Core types

**Files:**

- Create: `packages/common/graph-engine/src/types.ts`
- Create: `packages/common/graph-engine/src/types.test.ts`
- Modify: `packages/common/graph-engine/src/index.ts`

- [ ] **Step 1: Write the failing test**

`src/types.test.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type LayoutEdge, type LayoutNode, type Point, type Rect, rectContains } from './types';

describe('types', () => {
  test('rectContains returns true for point inside rect', ({ expect }) => {
    const r: Rect = { x: 0, y: 0, width: 10, height: 10 };
    const p: Point = [5, 5];
    expect(rectContains(r, p)).toBe(true);
  });

  test('rectContains returns false for point outside rect', ({ expect }) => {
    const r: Rect = { x: 0, y: 0, width: 10, height: 10 };
    expect(rectContains(r, [15, 5])).toBe(false);
    expect(rectContains(r, [5, -1])).toBe(false);
  });

  test('LayoutNode has id and optional position/radius', ({ expect }) => {
    const n: LayoutNode = { id: 'a', type: 't', x: 1, y: 2, r: 3 };
    expect(n.id).toBe('a');
  });

  test('LayoutEdge holds source and target refs', ({ expect }) => {
    const a: LayoutNode = { id: 'a' };
    const b: LayoutNode = { id: 'b' };
    const e: LayoutEdge = { id: 'e1', source: a, target: b };
    expect(e.source.id).toBe('a');
  });
});
```

- [ ] **Step 2: Run test to confirm failure**

Run: `moon run graph-engine:test -- src/types.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement types.ts**

```ts
//
// Copyright 2026 DXOS.org
//

export type Point = [number, number];

export type Size = { width: number; height: number };

export type Rect = { x: number; y: number; width: number; height: number };

export const rectContains = (r: Rect, [px, py]: Point): boolean =>
  px >= r.x && px <= r.x + r.width && py >= r.y && py <= r.y + r.height;

/**
 * Layout-space node — projector output, renderer input.
 */
export type LayoutNode<NodeData = any> = {
  id: string;
  type?: string;
  data?: NodeData;
  x?: number;
  y?: number;
  r?: number;
  initialized?: boolean;
};

/**
 * Layout-space edge — references resolved `LayoutNode`s.
 */
export type LayoutEdge<NodeData = any, EdgeData = any> = {
  id: string;
  type?: string;
  data?: EdgeData;
  source: LayoutNode<NodeData>;
  target: LayoutNode<NodeData>;
};

export type LayoutGraph<NodeData = any, EdgeData = any> = {
  nodes: LayoutNode<NodeData>[];
  edges: LayoutEdge<NodeData, EdgeData>[];
};

/**
 * High-level semantic pointer event emitted by tools after gesture detection.
 */
export type SemanticPointerEvent =
  | { type: 'hover-enter'; entityId: string; native: PointerEvent }
  | { type: 'hover-leave'; entityId: string; native: PointerEvent }
  | { type: 'select'; entityId: string; additive: boolean; native: PointerEvent }
  | { type: 'click'; entityId: string; native: PointerEvent };
```

- [ ] **Step 4: Re-export from index**

`src/index.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

export * from './types';
```

- [ ] **Step 5: Run tests**

Run: `moon run graph-engine:test -- src/types.test.ts`
Expected: PASS — 4 tests.

- [ ] **Step 6: Commit**

```bash
git add packages/common/graph-engine/src
git commit -m "feat(graph-engine): core layout and geometry types

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Path primitive

**Files:**

- Create: `packages/common/graph-engine/src/draw/path.ts`
- Create: `packages/common/graph-engine/src/draw/path.test.ts`
- Modify: `packages/common/graph-engine/src/index.ts`

- [ ] **Step 1: Write the failing test**

`src/draw/path.test.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { createPath } from './path';

describe('Path', () => {
  test('records a straight line', ({ expect }) => {
    const p = createPath();
    p.moveTo(0, 0);
    p.lineTo(10, 10);
    expect(p.commands).toEqual([
      { type: 'M', x: 0, y: 0 },
      { type: 'L', x: 10, y: 10 },
    ]);
  });

  test('toSvg returns SVG path data', ({ expect }) => {
    const p = createPath();
    p.moveTo(0, 0);
    p.lineTo(10, 10);
    p.close();
    expect(p.toSvg()).toBe('M0 0 L10 10 Z');
  });

  test('records a bezier and arc', ({ expect }) => {
    const p = createPath();
    p.moveTo(0, 0);
    p.bezierCurveTo(1, 1, 2, 2, 3, 3);
    p.arc(0, 0, 5, 0, Math.PI);
    expect(p.commands.length).toBe(3);
  });
});
```

- [ ] **Step 2: Run test to confirm failure**

Run: `moon run graph-engine:test -- src/draw/path.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement path.ts**

```ts
//
// Copyright 2026 DXOS.org
//

export type PathCommand =
  | { type: 'M'; x: number; y: number }
  | { type: 'L'; x: number; y: number }
  | { type: 'C'; cx1: number; cy1: number; cx2: number; cy2: number; x: number; y: number }
  | { type: 'A'; cx: number; cy: number; r: number; a0: number; a1: number; ccw?: boolean }
  | { type: 'Z' };

/**
 * Backend-neutral path. Records commands; backends consume to produce SVG `d` or `Path2D`.
 */
export interface Path {
  readonly commands: readonly PathCommand[];
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  bezierCurveTo(cx1: number, cy1: number, cx2: number, cy2: number, x: number, y: number): void;
  arc(cx: number, cy: number, r: number, a0: number, a1: number, ccw?: boolean): void;
  close(): void;
  toSvg(): string;
}

export const createPath = (): Path => {
  const commands: PathCommand[] = [];
  return {
    get commands() {
      return commands;
    },
    moveTo(x, y) {
      commands.push({ type: 'M', x, y });
    },
    lineTo(x, y) {
      commands.push({ type: 'L', x, y });
    },
    bezierCurveTo(cx1, cy1, cx2, cy2, x, y) {
      commands.push({ type: 'C', cx1, cy1, cx2, cy2, x, y });
    },
    arc(cx, cy, r, a0, a1, ccw) {
      commands.push({ type: 'A', cx, cy, r, a0, a1, ccw });
    },
    close() {
      commands.push({ type: 'Z' });
    },
    toSvg() {
      return commands
        .map((c) => {
          switch (c.type) {
            case 'M':
              return `M${c.x} ${c.y}`;
            case 'L':
              return `L${c.x} ${c.y}`;
            case 'C':
              return `C${c.cx1} ${c.cy1} ${c.cx2} ${c.cy2} ${c.x} ${c.y}`;
            case 'A':
              return `A${c.r} ${c.r} 0 0 ${c.ccw ? 0 : 1} ${c.cx + Math.cos(c.a1) * c.r} ${c.cy + Math.sin(c.a1) * c.r}`;
            case 'Z':
              return 'Z';
          }
        })
        .join(' ');
    },
  };
};
```

- [ ] **Step 4: Update index**

`src/index.ts` (append):

```ts
export * from './draw/path';
```

- [ ] **Step 5: Run tests**

Run: `moon run graph-engine:test -- src/draw/path.test.ts`
Expected: PASS — 3 tests.

- [ ] **Step 6: Commit**

```bash
git add packages/common/graph-engine/src
git commit -m "feat(graph-engine): backend-neutral Path primitive

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: DrawContext interface

**Files:**

- Create: `packages/common/graph-engine/src/draw/draw-context.ts`
- Modify: `packages/common/graph-engine/src/index.ts`

No behavior to test — pure interface. The Canvas implementation in Task 17 exercises it.

- [ ] **Step 1: Define DrawContext**

```ts
//
// Copyright 2026 DXOS.org
//

import { type Path } from './path';

export type FillStyle = string;
export type StrokeStyle = string;

/**
 * Backend-neutral drawing API. Handlers draw against this; backends adapt to SVG or Canvas.
 */
export interface DrawContext {
  save(): void;
  restore(): void;
  /** Apply a 2D affine transform to subsequent commands. */
  transform(a: number, b: number, c: number, d: number, e: number, f: number): void;
  setFill(style: FillStyle): void;
  setStroke(style: StrokeStyle): void;
  setLineWidth(width: number): void;
  setFont(font: string): void;
  fill(path: Path): void;
  stroke(path: Path): void;
  text(
    content: string,
    x: number,
    y: number,
    opts?: { align?: 'left' | 'center' | 'right'; baseline?: 'top' | 'middle' | 'bottom' },
  ): void;
}
```

- [ ] **Step 2: Update index**

```ts
export * from './draw/draw-context';
```

- [ ] **Step 3: Verify build**

Run: `moon run graph-engine:build --quiet 2>&1 | tail -10`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add packages/common/graph-engine/src
git commit -m "feat(graph-engine): backend-neutral DrawContext interface

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Viewport

**Files:**

- Create: `packages/common/graph-engine/src/viewport.ts`
- Create: `packages/common/graph-engine/src/viewport.test.ts`
- Modify: `packages/common/graph-engine/src/index.ts`

- [ ] **Step 1: Write the failing test**

```ts
//
// Copyright 2026 DXOS.org
//

import { zoomIdentity } from 'd3';
import { describe, test } from 'vitest';

import { Viewport } from './viewport';

describe('Viewport', () => {
  test('default scale is 1, transform is identity', ({ expect }) => {
    const v = new Viewport();
    expect(v.scale).toBe(1);
    expect(v.transform.k).toBe(1);
  });

  test('worldToScreen and screenToWorld are inverse', ({ expect }) => {
    const v = new Viewport();
    v.setSize({ width: 200, height: 100 });
    v.setTransform(zoomIdentity.translate(10, 20).scale(2));
    const screen = v.worldToScreen([3, 4]);
    const world = v.screenToWorld(screen);
    expect(world[0]).toBeCloseTo(3);
    expect(world[1]).toBeCloseTo(4);
  });

  test('setSize emits resized', ({ expect }) => {
    const v = new Viewport();
    let fired = 0;
    v.resized.on(() => fired++);
    v.setSize({ width: 100, height: 50 });
    v.setSize({ width: 100, height: 50 }); // no change → no fire
    v.setSize({ width: 200, height: 50 });
    expect(fired).toBe(2);
  });

  test('frame emits and carries timestamp', ({ expect }) => {
    const v = new Viewport();
    const events: number[] = [];
    v.frame.on(({ t }) => events.push(t));
    v.tick(0);
    v.tick(16);
    expect(events).toEqual([0, 16]);
  });
});
```

- [ ] **Step 2: Run test to confirm failure**

Run: `moon run graph-engine:test -- src/viewport.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement viewport.ts**

```ts
//
// Copyright 2026 DXOS.org
//

import { type ZoomTransform, zoomIdentity } from 'd3';

import { EventEmitter } from '@dxos/async';

import { type Point, type Rect, type Size } from './types';

/**
 * Pure viewport state. No DOM.
 */
export class Viewport {
  #size: Size = { width: 0, height: 0 };
  #transform: ZoomTransform = zoomIdentity;

  readonly resized = new EventEmitter<Size>();
  readonly transformed = new EventEmitter<ZoomTransform>();
  readonly frame = new EventEmitter<{ t: number }>();

  get size(): Size {
    return this.#size;
  }

  get transform(): ZoomTransform {
    return this.#transform;
  }

  get scale(): number {
    return this.#transform.k;
  }

  setSize(size: Size): void {
    if (this.#size.width === size.width && this.#size.height === size.height) {
      return;
    }
    this.#size = { ...size };
    this.resized.emit(this.#size);
  }

  setTransform(t: ZoomTransform): void {
    if (this.#transform.x === t.x && this.#transform.y === t.y && this.#transform.k === t.k) {
      return;
    }
    this.#transform = t;
    this.transformed.emit(t);
  }

  worldToScreen([x, y]: Point): Point {
    const { x: tx, y: ty, k } = this.#transform;
    return [x * k + tx, y * k + ty];
  }

  screenToWorld([sx, sy]: Point): Point {
    const { x: tx, y: ty, k } = this.#transform;
    return [(sx - tx) / k, (sy - ty) / k];
  }

  visibleBounds(): Rect {
    const tl = this.screenToWorld([0, 0]);
    const br = this.screenToWorld([this.#size.width, this.#size.height]);
    return { x: tl[0], y: tl[1], width: br[0] - tl[0], height: br[1] - tl[1] };
  }

  tick(t: number): void {
    this.frame.emit({ t });
  }
}
```

- [ ] **Step 4: Verify EventEmitter is exported from @dxos/async**

Run: `grep -r "EventEmitter" packages/common/async/src/index.ts`
Expected: at least one match. If absent, fall back to the v1 emitter in `packages/ui/react-ui-graph/src/util/events.ts` — copy that helper into `src/event-emitter.ts` in graph-engine instead and import from there. Apply the same substitution in later tasks.

- [ ] **Step 5: Update index**

```ts
export * from './viewport';
```

- [ ] **Step 6: Run tests**

Run: `moon run graph-engine:test -- src/viewport.test.ts`
Expected: PASS — 4 tests.

- [ ] **Step 7: Commit**

```bash
git add packages/common/graph-engine/src
git commit -m "feat(graph-engine): Viewport with world/screen math and frame events

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: TweenService

**Files:**

- Create: `packages/common/graph-engine/src/tween/tween-service.ts`
- Create: `packages/common/graph-engine/src/tween/tween-service.test.ts`
- Modify: `packages/common/graph-engine/src/index.ts`

- [ ] **Step 1: Write the failing test**

```ts
//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { TweenService } from './tween-service';

describe('TweenService', () => {
  test('immediate setTarget with duration 0 snaps to target', ({ expect }) => {
    const svc = new TweenService();
    svc.setTarget('a', { x: 10, y: 20 }, { duration: 0 });
    svc.advance(0);
    const v = svc.read('a')!;
    expect(v.x).toBe(10);
    expect(v.y).toBe(20);
  });

  test('interpolates linearly when duration > 0', ({ expect }) => {
    const svc = new TweenService();
    svc.setTarget('a', { x: 0, y: 0 }, { duration: 0 });
    svc.advance(0);
    svc.setTarget('a', { x: 100, y: 0 }, { duration: 1000, easing: 'linear' });
    svc.advance(500);
    const v = svc.read('a')!;
    expect(v.x).toBeCloseTo(50, 1);
  });

  test('isAnimating reflects pending tweens', ({ expect }) => {
    const svc = new TweenService();
    svc.setTarget('a', { x: 0, y: 0 }, { duration: 0 });
    svc.advance(0);
    expect(svc.isAnimating()).toBe(false);
    svc.setTarget('a', { x: 100, y: 0 }, { duration: 100 });
    expect(svc.isAnimating()).toBe(true);
    svc.advance(100);
    expect(svc.isAnimating()).toBe(false);
  });

  test('remove drops an entity', ({ expect }) => {
    const svc = new TweenService();
    svc.setTarget('a', { x: 1, y: 2 }, { duration: 0 });
    svc.advance(0);
    svc.remove('a');
    expect(svc.read('a')).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to confirm failure**

Run: `moon run graph-engine:test -- src/tween/tween-service.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement tween-service.ts**

```ts
//
// Copyright 2026 DXOS.org
//

import { easeCubicOut } from 'd3';

export type TweenValue = { x: number; y: number; r?: number };

export type EasingId = 'linear' | 'cubic-out';

export type TweenOptions = {
  duration?: number; // ms; default 300
  easing?: EasingId; // default 'cubic-out'
};

type Entry = {
  source: TweenValue;
  target: TweenValue;
  current: TweenValue;
  startedAt?: number;
  duration: number;
  easing: EasingId;
};

const easings: Record<EasingId, (t: number) => number> = {
  linear: (t) => t,
  'cubic-out': easeCubicOut,
};

/**
 * Single source of animated layout values. Projectors call setTarget; the service produces frames.
 */
export class TweenService {
  #entries = new Map<string, Entry>();
  #now = 0;

  /**
   * Publish a new target for an entity. If duration is 0, the entity snaps to target.
   */
  setTarget(id: string, target: TweenValue, opts?: TweenOptions): void {
    const duration = opts?.duration ?? 300;
    const easing = opts?.easing ?? 'cubic-out';
    const existing = this.#entries.get(id);
    if (!existing) {
      this.#entries.set(id, {
        source: { ...target },
        target: { ...target },
        current: { ...target },
        startedAt: duration > 0 ? this.#now : undefined,
        duration,
        easing,
      });
      return;
    }
    existing.source = { ...existing.current };
    existing.target = { ...target };
    existing.duration = duration;
    existing.easing = easing;
    existing.startedAt = duration > 0 ? this.#now : undefined;
    if (duration === 0) {
      existing.current = { ...target };
    }
  }

  /**
   * Advance the clock to `t` (ms since arbitrary origin). Computes new currents.
   */
  advance(t: number): void {
    this.#now = t;
    for (const e of this.#entries.values()) {
      if (e.startedAt === undefined) {
        continue;
      }
      const elapsed = t - e.startedAt;
      if (elapsed >= e.duration) {
        e.current = { ...e.target };
        e.startedAt = undefined;
        continue;
      }
      const u = easings[e.easing](elapsed / e.duration);
      e.current = {
        x: e.source.x + (e.target.x - e.source.x) * u,
        y: e.source.y + (e.target.y - e.source.y) * u,
        r:
          e.source.r !== undefined && e.target.r !== undefined
            ? e.source.r + (e.target.r - e.source.r) * u
            : (e.target.r ?? e.source.r),
      };
    }
  }

  read(id: string): TweenValue | undefined {
    return this.#entries.get(id)?.current;
  }

  remove(id: string): void {
    this.#entries.delete(id);
  }

  isAnimating(): boolean {
    for (const e of this.#entries.values()) {
      if (e.startedAt !== undefined) {
        return true;
      }
    }
    return false;
  }
}
```

- [ ] **Step 4: Update index**

```ts
export * from './tween/tween-service';
```

- [ ] **Step 5: Run tests**

Run: `moon run graph-engine:test -- src/tween/tween-service.test.ts`
Expected: PASS — 4 tests.

- [ ] **Step 6: Commit**

```bash
git add packages/common/graph-engine/src
git commit -m "feat(graph-engine): TweenService for entity-level interpolation

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Registry — handler & island types

**Files:**

- Create: `packages/common/graph-engine/src/registry/handlers.ts`
- Modify: `packages/common/graph-engine/src/index.ts`

- [ ] **Step 1: Implement handlers.ts**

```ts
//
// Copyright 2026 DXOS.org
//

import { type ReactNode } from 'react';

import { type DrawContext } from '../draw/draw-context';
import { type Path } from '../draw/path';
import { type LayoutEdge, type LayoutNode, type Point, type Rect, type SemanticPointerEvent } from '../types';
import { type Viewport } from '../viewport';

export type LodScaling = 'fixed-pixel' | 'world' | 'hybrid';

export type LodLevel = {
  minScale: number;
  maxScale?: number;
  render: 'full' | 'compact' | 'dot';
};

export type NodeCapabilities = {
  draggable?: boolean;
  linkable?: boolean;
  selectable?: boolean;
  hoverable?: boolean;
  inspectable?: boolean;
};

export type EdgeCapabilities = {
  selectable?: boolean;
  hoverable?: boolean;
};

export type NodeIsland<NodeData = any> = {
  render(node: LayoutNode<NodeData>, viewport: Viewport, engineHandle: EngineHandle): ReactNode;
  anchor?: 'center' | 'top' | 'bottom' | { offset: Point };
  scaling?: LodScaling;
  passthrough?: boolean;
  show?: (viewport: Viewport) => boolean;
};

export type EdgeIsland<NodeData = any, EdgeData = any> = {
  render(edge: LayoutEdge<NodeData, EdgeData>, path: Path, viewport: Viewport, engineHandle: EngineHandle): ReactNode;
  anchor?: 'midpoint' | { t: number } | ((path: Path) => Point);
  scaling?: LodScaling;
  passthrough?: boolean;
  show?: (viewport: Viewport) => boolean;
};

/**
 * Minimal handle passed to handlers — avoids a circular dep with engine.ts.
 */
export type EngineHandle = {
  readonly viewport: Viewport;
  bringToFront(islandId: string): void;
};

export type NodeHandler<NodeData = any> = {
  draw(ctx: DrawContext, node: LayoutNode<NodeData>, viewport: Viewport): void;
  bounds(node: LayoutNode<NodeData>): Rect;
  hit(point: Point, node: LayoutNode<NodeData>): boolean;
  preferredRadius?: number | ((node: LayoutNode<NodeData>, children: number) => number);
  layoutWeight?: number;
  lod?: { scaling: LodScaling; levels?: LodLevel[] };
  capabilities?: NodeCapabilities;
  onPointer?(event: SemanticPointerEvent, node: LayoutNode<NodeData>, engineHandle: EngineHandle): void | 'veto';
  island?: NodeIsland<NodeData>;
};

export type EdgeRouterId = 'straight' | 'bezier' | 'orthogonal' | 'radial-arc';

export type EdgeHandler<NodeData = any, EdgeData = any> = {
  router: EdgeRouterId | import('../router/router').EdgeRouter<NodeData, EdgeData>;
  draw(ctx: DrawContext, edge: LayoutEdge<NodeData, EdgeData>, path: Path, viewport: Viewport): void;
  hit(point: Point, edge: LayoutEdge<NodeData, EdgeData>, path: Path): boolean;
  bounds(edge: LayoutEdge<NodeData, EdgeData>, path: Path): Rect;
  lod?: { scaling: LodScaling; levels?: LodLevel[] };
  capabilities?: EdgeCapabilities;
  onPointer?(
    event: SemanticPointerEvent,
    edge: LayoutEdge<NodeData, EdgeData>,
    engineHandle: EngineHandle,
  ): void | 'veto';
  island?: EdgeIsland<NodeData, EdgeData>;
};
```

- [ ] **Step 2: Add `react` to graph-engine dev/peer deps**

Edit `packages/common/graph-engine/package.json`:

- Add `"react": "catalog:"` to `peerDependencies`.
- Add `"@types/react": "catalog:"` to `devDependencies`.

Then run: `pnpm install --filter @dxos/graph-engine`.

- [ ] **Step 3: Update index**

```ts
export * from './registry/handlers';
```

- [ ] **Step 4: Verify build**

Run: `moon run graph-engine:build --quiet 2>&1 | tail -10`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add packages/common/graph-engine packages/common/graph-engine/package.json pnpm-lock.yaml
git commit -m "feat(graph-engine): node and edge handler/island types

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: TypeRegistry + default handlers

**Files:**

- Create: `packages/common/graph-engine/src/registry/type-registry.ts`
- Create: `packages/common/graph-engine/src/registry/type-registry.test.ts`
- Create: `packages/common/graph-engine/src/registry/default-handlers.ts`
- Modify: `packages/common/graph-engine/src/index.ts`

- [ ] **Step 1: Write the failing test**

```ts
//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { TypeRegistry } from './type-registry';
import { defaultNodeHandler, defaultEdgeHandler } from './default-handlers';

describe('TypeRegistry', () => {
  test('falls back to default handler when type unknown', ({ expect }) => {
    const r = new TypeRegistry();
    const h = r.resolveNode({ id: 'x', type: 'unknown' });
    expect(h).toBe(defaultNodeHandler);
  });

  test('returns registered handler for matching type', ({ expect }) => {
    const r = new TypeRegistry();
    const customHandler = { ...defaultNodeHandler };
    r.registerNode('person', customHandler);
    expect(r.resolveNode({ id: 'x', type: 'person' })).toBe(customHandler);
  });

  test('untyped node resolves to default', ({ expect }) => {
    const r = new TypeRegistry();
    expect(r.resolveNode({ id: 'x' })).toBe(defaultNodeHandler);
  });

  test('edge fallback works the same way', ({ expect }) => {
    const r = new TypeRegistry();
    expect(r.resolveEdge({ id: 'e', source: 'a', target: 'b' } as any)).toBe(defaultEdgeHandler);
  });
});
```

- [ ] **Step 2: Run test to confirm failure**

Run: `moon run graph-engine:test -- src/registry/type-registry.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement default-handlers.ts**

```ts
//
// Copyright 2026 DXOS.org
//

import { createPath } from '../draw/path';
import { type EdgeHandler, type NodeHandler } from './handlers';

const DEFAULT_RADIUS = 8;

export const defaultNodeHandler: NodeHandler = {
  draw(ctx, node) {
    const r = node.r ?? DEFAULT_RADIUS;
    const x = node.x ?? 0;
    const y = node.y ?? 0;
    const p = createPath();
    p.arc(x, y, r, 0, Math.PI * 2);
    p.close();
    ctx.setFill('#888');
    ctx.fill(p);
  },
  bounds(node) {
    const r = node.r ?? DEFAULT_RADIUS;
    const x = node.x ?? 0;
    const y = node.y ?? 0;
    return { x: x - r, y: y - r, width: r * 2, height: r * 2 };
  },
  hit([px, py], node) {
    const r = node.r ?? DEFAULT_RADIUS;
    const dx = (node.x ?? 0) - px;
    const dy = (node.y ?? 0) - py;
    return dx * dx + dy * dy <= r * r;
  },
  capabilities: { hoverable: true, selectable: true },
};

export const defaultEdgeHandler: EdgeHandler = {
  router: 'straight',
  draw(ctx, _edge, path) {
    ctx.setStroke('#aaa');
    ctx.setLineWidth(1);
    ctx.stroke(path);
  },
  hit() {
    // Phase 1: edge hit-testing deferred (linker tool not yet shipped).
    return false;
  },
  bounds(edge) {
    const { source, target } = edge;
    const x = Math.min(source.x ?? 0, target.x ?? 0);
    const y = Math.min(source.y ?? 0, target.y ?? 0);
    const width = Math.abs((target.x ?? 0) - (source.x ?? 0));
    const height = Math.abs((target.y ?? 0) - (source.y ?? 0));
    return { x, y, width, height };
  },
};
```

- [ ] **Step 4: Implement type-registry.ts**

```ts
//
// Copyright 2026 DXOS.org
//

import { type Graph } from '@dxos/graph';

import { type EdgeHandler, type NodeHandler } from './handlers';
import { defaultEdgeHandler, defaultNodeHandler } from './default-handlers';

/**
 * Maps node/edge `type` to its handler. Resolves to a built-in default when missing.
 */
export class TypeRegistry<NodeData = any, EdgeData = any> {
  #nodes = new Map<string, NodeHandler<NodeData>>();
  #edges = new Map<string, EdgeHandler<NodeData, EdgeData>>();

  registerNode(type: string, handler: NodeHandler<NodeData>): void {
    this.#nodes.set(type, handler);
  }

  registerEdge(type: string, handler: EdgeHandler<NodeData, EdgeData>): void {
    this.#edges.set(type, handler);
  }

  resolveNode(node: Graph.Node.Any): NodeHandler<NodeData> {
    return (node.type ? this.#nodes.get(node.type) : undefined) ?? (defaultNodeHandler as NodeHandler<NodeData>);
  }

  resolveEdge(edge: Graph.Edge.Any): EdgeHandler<NodeData, EdgeData> {
    return (
      (edge.type ? this.#edges.get(edge.type) : undefined) ?? (defaultEdgeHandler as EdgeHandler<NodeData, EdgeData>)
    );
  }
}
```

- [ ] **Step 5: Update index**

```ts
export * from './registry/type-registry';
export * from './registry/default-handlers';
```

- [ ] **Step 6: Run tests**

Run: `moon run graph-engine:test -- src/registry/type-registry.test.ts`
Expected: PASS — 4 tests.

- [ ] **Step 7: Commit**

```bash
git add packages/common/graph-engine/src
git commit -m "feat(graph-engine): TypeRegistry with default node/edge handlers

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: Projector abstract base

**Files:**

- Create: `packages/common/graph-engine/src/projector/projector.ts`
- Create: `packages/common/graph-engine/src/projector/projector.test.ts`
- Modify: `packages/common/graph-engine/src/index.ts`

- [ ] **Step 1: Write the failing test**

```ts
//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type Graph } from '@dxos/graph';

import { type LayoutGraph } from '../types';
import { Projector } from './projector';

class TestProjector extends Projector {
  layout: LayoutGraph = { nodes: [], edges: [] };
  ticks = 0;
  override onUpdate(graph: Graph.Any) {
    this.layout = {
      nodes: graph.nodes.map((n) => ({ id: n.id, x: 0, y: 0 })),
      edges: [],
    };
  }
  override onTick(): boolean {
    this.ticks++;
    return false;
  }
  override findNode() {
    return undefined;
  }
}

describe('Projector', () => {
  test('updateData calls onUpdate and emits', ({ expect }) => {
    const p = new TestProjector();
    let fired = 0;
    p.updated.on(() => fired++);
    p.updateData({ nodes: [{ id: 'a' }], edges: [] });
    expect(fired).toBe(1);
    expect(p.layout.nodes).toHaveLength(1);
  });

  test('tick delegates to onTick', ({ expect }) => {
    const p = new TestProjector();
    p.tick(16);
    p.tick(33);
    expect(p.ticks).toBe(2);
  });
});
```

- [ ] **Step 2: Run test to confirm failure**

Run: `moon run graph-engine:test -- src/projector/projector.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement projector.ts**

```ts
//
// Copyright 2026 DXOS.org
//

import { EventEmitter } from '@dxos/async';
import { type Graph } from '@dxos/graph';

import { type LayoutGraph, type LayoutNode } from '../types';

/**
 * Projector base. Subclasses translate a `Graph` into a `LayoutGraph` and publish targets each tick.
 */
export abstract class Projector<NodeData = any, EdgeData = any> {
  readonly updated = new EventEmitter<{ layout: LayoutGraph<NodeData, EdgeData> }>();

  abstract get layout(): LayoutGraph<NodeData, EdgeData>;

  /**
   * Called when the underlying graph changes.
   */
  updateData(graph: Graph.Any | undefined): void {
    this.onUpdate(graph ?? { nodes: [], edges: [] });
    this.updated.emit({ layout: this.layout });
  }

  /**
   * Called each frame. Return true if the projector still wants more frames.
   */
  tick(dt: number): boolean {
    const more = this.onTick(dt);
    this.updated.emit({ layout: this.layout });
    return more;
  }

  abstract findNode(x: number, y: number, radius: number): LayoutNode<NodeData> | undefined;

  start(): void {}
  stop(): void {}

  protected abstract onUpdate(graph: Graph.Any): void;
  protected abstract onTick(dt: number): boolean;
}
```

- [ ] **Step 4: Update index**

```ts
export * from './projector/projector';
```

- [ ] **Step 5: Run tests**

Run: `moon run graph-engine:test -- src/projector/projector.test.ts`
Expected: PASS — 2 tests.

- [ ] **Step 6: Commit**

```bash
git add packages/common/graph-engine/src
git commit -m "feat(graph-engine): Projector abstract base with updated event

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: ForceProjector

**Files:**

- Create: `packages/common/graph-engine/src/projector/force-projector.ts`
- Create: `packages/common/graph-engine/src/projector/force-projector.test.ts`
- Modify: `packages/common/graph-engine/src/index.ts`
- Reference: `packages/ui/react-ui-graph/src/graph/projector/graph-force-projector.ts` (v1 — port and adapt; do NOT delete v1).

- [ ] **Step 1: Write the failing test**

```ts
//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ForceProjector } from './force-projector';

describe('ForceProjector', () => {
  test('produces layout nodes for each graph node with positions', ({ expect }) => {
    const p = new ForceProjector();
    p.updateData({
      nodes: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
      edges: [
        { id: 'e1', source: 'a', target: 'b' },
        { id: 'e2', source: 'b', target: 'c' },
      ],
    });
    expect(p.layout.nodes).toHaveLength(3);
    expect(p.layout.edges).toHaveLength(2);
    for (const n of p.layout.nodes) {
      expect(typeof n.x).toBe('number');
      expect(typeof n.y).toBe('number');
    }
  });

  test('tick moves the simulation', ({ expect }) => {
    const p = new ForceProjector();
    p.updateData({
      nodes: [{ id: 'a' }, { id: 'b' }],
      edges: [{ id: 'e', source: 'a', target: 'b' }],
    });
    const before = p.layout.nodes.map((n) => ({ x: n.x, y: n.y }));
    for (let i = 0; i < 30; i++) {
      p.tick(16);
    }
    const after = p.layout.nodes.map((n) => ({ x: n.x, y: n.y }));
    const moved = before.some((b, i) => b.x !== after[i].x || b.y !== after[i].y);
    expect(moved).toBe(true);
  });

  test('findNode returns nearest node within radius', ({ expect }) => {
    const p = new ForceProjector();
    p.updateData({ nodes: [{ id: 'a' }], edges: [] });
    p.layout.nodes[0].x = 10;
    p.layout.nodes[0].y = 20;
    expect(p.findNode(10, 20, 5)?.id).toBe('a');
    expect(p.findNode(100, 100, 5)).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to confirm failure**

Run: `moon run graph-engine:test -- src/projector/force-projector.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement force-projector.ts (port from v1)**

```ts
//
// Copyright 2026 DXOS.org
//

import { type Simulation, forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation } from 'd3';

import { type Graph } from '@dxos/graph';
import { log } from '@dxos/log';

import { type LayoutEdge, type LayoutGraph, type LayoutNode } from '../types';
import { Projector } from './projector';

const DEFAULT_RADIUS = 200;

export type ForceProjectorOptions = {
  radius?: number;
  linkDistance?: number;
  manyBodyStrength?: number;
  collideRadius?: number;
};

/**
 * D3 force-directed projector. Owns its own simulation; tick() integrates one step.
 */
export class ForceProjector<NodeData = any, EdgeData = any> extends Projector<NodeData, EdgeData> {
  readonly #layout: LayoutGraph<NodeData, EdgeData> = { nodes: [], edges: [] };
  readonly #simulation: Simulation<LayoutNode<NodeData>, LayoutEdge<NodeData, EdgeData>>;
  readonly #options: ForceProjectorOptions;

  constructor(options: ForceProjectorOptions = {}) {
    super();
    this.#options = options;
    this.#simulation = forceSimulation<LayoutNode<NodeData>, LayoutEdge<NodeData, EdgeData>>()
      .stop()
      .alphaDecay(0)
      .velocityDecay(0.3);
  }

  get layout() {
    return this.#layout;
  }

  override findNode(x: number, y: number, radius: number): LayoutNode<NodeData> | undefined {
    return this.#simulation.find(x, y, radius);
  }

  protected override onUpdate(graph: Graph.Any): void {
    log('force.update', { nodes: graph.nodes.length, edges: graph.edges.length });

    const radius = this.#options.radius ?? DEFAULT_RADIUS;
    const existing = new Map(this.#layout.nodes.map((n) => [n.id, n]));
    const nodes: LayoutNode<NodeData>[] = graph.nodes.map((n) => {
      const prev = existing.get(n.id);
      if (prev) {
        prev.data = n.data as NodeData | undefined;
        prev.type = n.type;
        return prev;
      }
      const a = 2 * Math.PI * Math.random();
      return {
        id: n.id,
        type: n.type,
        data: n.data as NodeData | undefined,
        x: Math.cos(a) * radius,
        y: Math.sin(a) * radius,
        r: 8,
        initialized: true,
      };
    });
    const nodeById = new Map(nodes.map((n) => [n.id, n]));
    const edges: LayoutEdge<NodeData, EdgeData>[] = graph.edges
      .map((e) => {
        const source = nodeById.get(e.source);
        const target = nodeById.get(e.target);
        if (!source || !target) {
          return undefined;
        }
        return { id: e.id, type: e.type, data: e.data as EdgeData | undefined, source, target };
      })
      .filter((e): e is LayoutEdge<NodeData, EdgeData> => e !== undefined);

    this.#layout.nodes = nodes;
    this.#layout.edges = edges;

    this.#simulation
      .nodes(nodes)
      .force(
        'link',
        forceLink<LayoutNode<NodeData>, LayoutEdge<NodeData, EdgeData>>(edges)
          .id((n) => n.id)
          .distance(this.#options.linkDistance ?? 40),
      )
      .force('manyBody', forceManyBody().strength(this.#options.manyBodyStrength ?? -80))
      .force('collide', forceCollide(this.#options.collideRadius ?? 12))
      .force('center', forceCenter(0, 0))
      .alpha(1);
  }

  protected override onTick(_dt: number): boolean {
    this.#simulation.tick(1);
    return this.#simulation.alpha() > this.#simulation.alphaMin();
  }
}
```

- [ ] **Step 4: Update index**

```ts
export * from './projector/force-projector';
```

- [ ] **Step 5: Run tests**

Run: `moon run graph-engine:test -- src/projector/force-projector.test.ts`
Expected: PASS — 3 tests.

- [ ] **Step 6: Commit**

```bash
git add packages/common/graph-engine/src
git commit -m "feat(graph-engine): ForceProjector port of v1 force layout

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 11: EdgeRouter + StraightRouter

**Files:**

- Create: `packages/common/graph-engine/src/router/router.ts`
- Create: `packages/common/graph-engine/src/router/straight-router.ts`
- Create: `packages/common/graph-engine/src/router/straight-router.test.ts`
- Modify: `packages/common/graph-engine/src/index.ts`

- [ ] **Step 1: Write the failing test**

```ts
//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type LayoutEdge } from '../types';
import { StraightRouter } from './straight-router';

describe('StraightRouter', () => {
  test('routes a straight line clipped to node circumferences', ({ expect }) => {
    const router = new StraightRouter();
    const edge: LayoutEdge = {
      id: 'e',
      source: { id: 'a', x: 0, y: 0, r: 0 },
      target: { id: 'b', x: 100, y: 0, r: 0 },
    };
    const path = router.route(edge);
    expect(path.commands[0]).toEqual({ type: 'M', x: 0, y: 0 });
    expect(path.commands[1]).toEqual({ type: 'L', x: 100, y: 0 });
  });

  test('shrinks endpoints by node radii', ({ expect }) => {
    const router = new StraightRouter();
    const edge: LayoutEdge = {
      id: 'e',
      source: { id: 'a', x: 0, y: 0, r: 10 },
      target: { id: 'b', x: 100, y: 0, r: 5 },
    };
    const path = router.route(edge);
    expect(path.commands[0]).toEqual({ type: 'M', x: 10, y: 0 });
    expect(path.commands[1]).toEqual({ type: 'L', x: 95, y: 0 });
  });

  test('labelPoint returns midpoint at t=0.5', ({ expect }) => {
    const router = new StraightRouter();
    const edge: LayoutEdge = {
      id: 'e',
      source: { id: 'a', x: 0, y: 0, r: 0 },
      target: { id: 'b', x: 100, y: 0, r: 0 },
    };
    const path = router.route(edge);
    const [x, y] = router.labelPoint(0.5, path);
    expect(x).toBeCloseTo(50);
    expect(y).toBeCloseTo(0);
  });
});
```

- [ ] **Step 2: Run test to confirm failure**

Run: `moon run graph-engine:test -- src/router/straight-router.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement router.ts**

```ts
//
// Copyright 2026 DXOS.org
//

import { type Path } from '../draw/path';
import { type LayoutEdge, type Point } from '../types';

/**
 * Computes a path between two layout nodes for a given edge.
 */
export interface EdgeRouter<NodeData = any, EdgeData = any> {
  route(edge: LayoutEdge<NodeData, EdgeData>): Path;
  labelPoint(t: number, path: Path): Point;
}
```

- [ ] **Step 4: Implement straight-router.ts**

```ts
//
// Copyright 2026 DXOS.org
//

import { type Path, createPath } from '../draw/path';
import { type LayoutEdge, type Point } from '../types';
import { type EdgeRouter } from './router';

export class StraightRouter<NodeData = any, EdgeData = any> implements EdgeRouter<NodeData, EdgeData> {
  route(edge: LayoutEdge<NodeData, EdgeData>): Path {
    const sx = edge.source.x ?? 0;
    const sy = edge.source.y ?? 0;
    const tx = edge.target.x ?? 0;
    const ty = edge.target.y ?? 0;
    const dx = tx - sx;
    const dy = ty - sy;
    const len = Math.hypot(dx, dy) || 1;
    const sr = edge.source.r ?? 0;
    const tr = edge.target.r ?? 0;
    const ux = dx / len;
    const uy = dy / len;
    const start: Point = [sx + ux * sr, sy + uy * sr];
    const end: Point = [tx - ux * tr, ty - uy * tr];
    const p = createPath();
    p.moveTo(start[0], start[1]);
    p.lineTo(end[0], end[1]);
    return p;
  }

  labelPoint(t: number, path: Path): Point {
    const m = path.commands.find((c) => c.type === 'M');
    const l = path.commands.find((c) => c.type === 'L');
    if (!m || !l || m.type !== 'M' || l.type !== 'L') {
      return [0, 0];
    }
    return [m.x + (l.x - m.x) * t, m.y + (l.y - m.y) * t];
  }
}
```

- [ ] **Step 5: Update index**

```ts
export * from './router/router';
export * from './router/straight-router';
```

- [ ] **Step 6: Run tests**

Run: `moon run graph-engine:test -- src/router/straight-router.test.ts`
Expected: PASS — 3 tests.

- [ ] **Step 7: Commit**

```bash
git add packages/common/graph-engine/src
git commit -m "feat(graph-engine): EdgeRouter contract + StraightRouter

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 12: Tool interface

**Files:**

- Create: `packages/common/graph-engine/src/tool/tool.ts`
- Modify: `packages/common/graph-engine/src/index.ts`

No behavior to test directly — Tasks 13–15 exercise this through concrete tools.

- [ ] **Step 1: Implement tool.ts**

```ts
//
// Copyright 2026 DXOS.org
//

import { type LayoutEdge, type LayoutNode } from '../types';

/**
 * Hit-test result handed to tools when locating an entity under a pointer.
 */
export type EntityHit = { kind: 'node'; node: LayoutNode } | { kind: 'edge'; edge: LayoutEdge } | undefined;

/**
 * Engine surface a Tool reads from.
 */
export interface ToolHost {
  hitTest(screenX: number, screenY: number): EntityHit;
  emitFrame(): void;
}

/**
 * Cross-cutting gesture FSM. Attached to the engine; receives DOM pointer events.
 */
export interface Tool {
  readonly id: string;
  attach(host: ToolHost, target: EventTarget): () => void;
}
```

- [ ] **Step 2: Update index**

```ts
export * from './tool/tool';
```

- [ ] **Step 3: Verify build**

Run: `moon run graph-engine:build --quiet 2>&1 | tail -10`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add packages/common/graph-engine/src
git commit -m "feat(graph-engine): Tool interface and ToolHost

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 13: HoverTool

**Files:**

- Create: `packages/common/graph-engine/src/tool/hover-tool.ts`
- Create: `packages/common/graph-engine/src/tool/hover-tool.test.ts`
- Modify: `packages/common/graph-engine/src/index.ts`

- [ ] **Step 1: Write the failing test**

```ts
//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type LayoutNode } from '../types';
import { HoverTool } from './hover-tool';
import { type EntityHit, type ToolHost } from './tool';

class FakeHost implements ToolHost {
  hit: EntityHit;
  framed = 0;
  hitTest(): EntityHit {
    return this.hit;
  }
  emitFrame() {
    this.framed++;
  }
}

const ev = (x: number, y: number) => new PointerEvent('pointermove', { clientX: x, clientY: y, bubbles: true });

describe('HoverTool', () => {
  test('emits hover-enter when pointer moves over a node', ({ expect }) => {
    const host = new FakeHost();
    const target = new EventTarget();
    const events: string[] = [];
    const tool = new HoverTool((e) => events.push(`${e.type}:${e.entityId}`));
    const detach = tool.attach(host, target);

    const nodeA: LayoutNode = { id: 'a' };
    host.hit = { kind: 'node', node: nodeA };
    target.dispatchEvent(ev(0, 0));

    expect(events).toEqual(['hover-enter:a']);

    detach();
  });

  test('emits hover-leave when pointer moves off a node', ({ expect }) => {
    const host = new FakeHost();
    const target = new EventTarget();
    const events: string[] = [];
    const tool = new HoverTool((e) => events.push(`${e.type}:${e.entityId}`));
    tool.attach(host, target);

    host.hit = { kind: 'node', node: { id: 'a' } };
    target.dispatchEvent(ev(0, 0));
    host.hit = undefined;
    target.dispatchEvent(ev(10, 10));

    expect(events).toEqual(['hover-enter:a', 'hover-leave:a']);
  });
});
```

- [ ] **Step 2: Run test to confirm failure**

Run: `moon run graph-engine:test -- src/tool/hover-tool.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement hover-tool.ts**

```ts
//
// Copyright 2026 DXOS.org
//

import { type SemanticPointerEvent } from '../types';
import { type Tool, type ToolHost } from './tool';

export type HoverEmit = (event: Extract<SemanticPointerEvent, { type: 'hover-enter' | 'hover-leave' }>) => void;

/**
 * Tracks the entity under the pointer; emits enter/leave around transitions.
 */
export class HoverTool implements Tool {
  readonly id = 'hover';
  #emit: HoverEmit;
  #current?: string;

  constructor(emit: HoverEmit) {
    this.#emit = emit;
  }

  attach(host: ToolHost, target: EventTarget): () => void {
    const onMove = (raw: Event) => {
      const e = raw as PointerEvent;
      const hit = host.hitTest(e.clientX, e.clientY);
      const id = hit?.kind === 'node' ? hit.node.id : hit?.kind === 'edge' ? hit.edge.id : undefined;
      if (id === this.#current) {
        return;
      }
      if (this.#current) {
        this.#emit({ type: 'hover-leave', entityId: this.#current, native: e });
      }
      if (id) {
        this.#emit({ type: 'hover-enter', entityId: id, native: e });
      }
      this.#current = id;
    };
    target.addEventListener('pointermove', onMove);
    return () => target.removeEventListener('pointermove', onMove);
  }
}
```

- [ ] **Step 4: Update index**

```ts
export * from './tool/hover-tool';
```

- [ ] **Step 5: Run tests**

Run: `moon run graph-engine:test -- src/tool/hover-tool.test.ts`
Expected: PASS — 2 tests.

- [ ] **Step 6: Commit**

```bash
git add packages/common/graph-engine/src
git commit -m "feat(graph-engine): HoverTool

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 14: SelectTool

**Files:**

- Create: `packages/common/graph-engine/src/tool/select-tool.ts`
- Create: `packages/common/graph-engine/src/tool/select-tool.test.ts`
- Modify: `packages/common/graph-engine/src/index.ts`

- [ ] **Step 1: Write the failing test**

```ts
//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type SemanticPointerEvent } from '../types';
import { SelectTool } from './select-tool';
import { type EntityHit, type ToolHost } from './tool';

class FakeHost implements ToolHost {
  hit: EntityHit;
  hitTest(): EntityHit {
    return this.hit;
  }
  emitFrame() {}
}

const downEv = (modifiers: { shift?: boolean; meta?: boolean } = {}) =>
  new PointerEvent('pointerdown', { clientX: 0, clientY: 0, shiftKey: !!modifiers.shift, metaKey: !!modifiers.meta });

describe('SelectTool', () => {
  test('emits select on node pointerdown', ({ expect }) => {
    const host = new FakeHost();
    host.hit = { kind: 'node', node: { id: 'a' } };
    const target = new EventTarget();
    const events: SemanticPointerEvent[] = [];
    const tool = new SelectTool((e) => events.push(e));
    tool.attach(host, target);
    target.dispatchEvent(downEv());
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ type: 'select', entityId: 'a', additive: false });
  });

  test('additive is true with shift', ({ expect }) => {
    const host = new FakeHost();
    host.hit = { kind: 'node', node: { id: 'a' } };
    const target = new EventTarget();
    const events: SemanticPointerEvent[] = [];
    new SelectTool((e) => events.push(e)).attach(host, target);
    target.dispatchEvent(downEv({ shift: true }));
    expect(events[0]).toMatchObject({ additive: true });
  });

  test('emits nothing on miss', ({ expect }) => {
    const host = new FakeHost();
    host.hit = undefined;
    const target = new EventTarget();
    const events: SemanticPointerEvent[] = [];
    new SelectTool((e) => events.push(e)).attach(host, target);
    target.dispatchEvent(downEv());
    expect(events).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to confirm failure**

Run: `moon run graph-engine:test -- src/tool/select-tool.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement select-tool.ts**

```ts
//
// Copyright 2026 DXOS.org
//

import { type SemanticPointerEvent } from '../types';
import { type Tool, type ToolHost } from './tool';

export type SelectEmit = (event: Extract<SemanticPointerEvent, { type: 'select' }>) => void;

export class SelectTool implements Tool {
  readonly id = 'select';
  #emit: SelectEmit;

  constructor(emit: SelectEmit) {
    this.#emit = emit;
  }

  attach(host: ToolHost, target: EventTarget): () => void {
    const onDown = (raw: Event) => {
      const e = raw as PointerEvent;
      const hit = host.hitTest(e.clientX, e.clientY);
      if (!hit) {
        return;
      }
      const id = hit.kind === 'node' ? hit.node.id : hit.edge.id;
      this.#emit({ type: 'select', entityId: id, additive: e.shiftKey || e.metaKey, native: e });
    };
    target.addEventListener('pointerdown', onDown);
    return () => target.removeEventListener('pointerdown', onDown);
  }
}
```

- [ ] **Step 4: Update index**

```ts
export * from './tool/select-tool';
```

- [ ] **Step 5: Run tests**

Run: `moon run graph-engine:test -- src/tool/select-tool.test.ts`
Expected: PASS — 3 tests.

- [ ] **Step 6: Commit**

```bash
git add packages/common/graph-engine/src
git commit -m "feat(graph-engine): SelectTool

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 15: ZoomTool

**Files:**

- Create: `packages/common/graph-engine/src/tool/zoom-tool.ts`
- Modify: `packages/common/graph-engine/src/index.ts`

ZoomTool uses d3-zoom which is hard to test in jsdom without a real DOM; smoke-test by attach/detach not throwing. Story exercises behaviorally.

- [ ] **Step 1: Implement zoom-tool.ts**

```ts
//
// Copyright 2026 DXOS.org
//

import { type ZoomBehavior, select, zoom } from 'd3';

import { type Viewport } from '../viewport';
import { type Tool, type ToolHost } from './tool';

export type ZoomToolOptions = {
  extent?: [number, number];
};

export class ZoomTool implements Tool {
  readonly id = 'zoom';
  #viewport: Viewport;
  #options: ZoomToolOptions;
  #zoom?: ZoomBehavior<Element, unknown>;

  constructor(viewport: Viewport, options: ZoomToolOptions = {}) {
    this.#viewport = viewport;
    this.#options = options;
  }

  attach(_host: ToolHost, target: EventTarget): () => void {
    const el = target as Element;
    this.#zoom = zoom<Element, unknown>()
      .scaleExtent(this.#options.extent ?? [0.25, 4])
      .on('zoom', (event) => this.#viewport.setTransform(event.transform));
    select(el).call(this.#zoom as any);
    return () => {
      select(el).on('.zoom', null);
    };
  }
}
```

- [ ] **Step 2: Update index**

```ts
export * from './tool/zoom-tool';
```

- [ ] **Step 3: Verify build**

Run: `moon run graph-engine:build --quiet 2>&1 | tail -10`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add packages/common/graph-engine/src
git commit -m "feat(graph-engine): ZoomTool driven by d3-zoom

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 16: RenderBackend interface

**Files:**

- Create: `packages/common/graph-engine/src/backend/render-backend.ts`
- Modify: `packages/common/graph-engine/src/index.ts`

- [ ] **Step 1: Implement render-backend.ts**

```ts
//
// Copyright 2026 DXOS.org
//

import { type DrawContext } from '../draw/draw-context';
import { type LayoutGraph } from '../types';
import { type Viewport } from '../viewport';

export type RenderFrame<NodeData = any, EdgeData = any> = {
  layout: LayoutGraph<NodeData, EdgeData>;
  viewport: Viewport;
};

/**
 * Backend driver. Concrete impls own the DOM element they render into.
 */
export interface RenderBackend {
  /** Resize the underlying surface. */
  resize(width: number, height: number, dpr: number): void;
  /** Returns the DrawContext for the current frame. */
  begin(): DrawContext;
  /** Finalize the frame (flush, swap, etc.). */
  end(): void;
}
```

- [ ] **Step 2: Update index**

```ts
export * from './backend/render-backend';
```

- [ ] **Step 3: Verify build**

Run: `moon run graph-engine:build --quiet 2>&1 | tail -10`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add packages/common/graph-engine/src
git commit -m "feat(graph-engine): RenderBackend interface

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 17: Canvas DrawContext and Path adapter

**Files:**

- Create: `packages/common/graph-engine/src/backend/canvas/canvas-draw-context.ts`
- Create: `packages/common/graph-engine/src/backend/canvas/canvas-draw-context.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
//
// Copyright 2026 DXOS.org
//

import { describe, test, vi } from 'vitest';

import { createPath } from '../../draw/path';
import { CanvasDrawContext } from './canvas-draw-context';

const fakeCtx = () => {
  const calls: string[] = [];
  return {
    calls,
    ctx: {
      save: vi.fn(() => calls.push('save')),
      restore: vi.fn(() => calls.push('restore')),
      beginPath: vi.fn(() => calls.push('beginPath')),
      moveTo: vi.fn((x, y) => calls.push(`moveTo(${x},${y})`)),
      lineTo: vi.fn((x, y) => calls.push(`lineTo(${x},${y})`)),
      bezierCurveTo: vi.fn(() => calls.push('bezierCurveTo')),
      arc: vi.fn(() => calls.push('arc')),
      closePath: vi.fn(() => calls.push('closePath')),
      fill: vi.fn(() => calls.push('fill')),
      stroke: vi.fn(() => calls.push('stroke')),
      fillText: vi.fn((s: string) => calls.push(`fillText:${s}`)),
      transform: vi.fn(() => calls.push('transform')),
      set fillStyle(_v: string) {
        calls.push(`fillStyle=${_v}`);
      },
      set strokeStyle(_v: string) {
        calls.push(`strokeStyle=${_v}`);
      },
      set lineWidth(_v: number) {
        calls.push(`lineWidth=${_v}`);
      },
      set font(_v: string) {
        calls.push(`font=${_v}`);
      },
      set textAlign(_v: string) {
        calls.push(`textAlign=${_v}`);
      },
      set textBaseline(_v: string) {
        calls.push(`textBaseline=${_v}`);
      },
    } as unknown as CanvasRenderingContext2D,
  };
};

describe('CanvasDrawContext', () => {
  test('translates a Path to canvas calls and fills', ({ expect }) => {
    const { ctx, calls } = fakeCtx();
    const dc = new CanvasDrawContext(ctx);
    const p = createPath();
    p.moveTo(0, 0);
    p.lineTo(10, 10);
    p.close();
    dc.setFill('#f00');
    dc.fill(p);
    expect(calls).toEqual(['fillStyle=#f00', 'beginPath', 'moveTo(0,0)', 'lineTo(10,10)', 'closePath', 'fill']);
  });

  test('text writes via fillText with alignment', ({ expect }) => {
    const { ctx, calls } = fakeCtx();
    const dc = new CanvasDrawContext(ctx);
    dc.text('hi', 5, 5, { align: 'center', baseline: 'middle' });
    expect(calls).toContain('textAlign=center');
    expect(calls).toContain('textBaseline=middle');
    expect(calls).toContain('fillText:hi');
  });
});
```

- [ ] **Step 2: Run test to confirm failure**

Run: `moon run graph-engine:test -- src/backend/canvas/canvas-draw-context.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement canvas-draw-context.ts**

```ts
//
// Copyright 2026 DXOS.org
//

import { type DrawContext } from '../../draw/draw-context';
import { type Path } from '../../draw/path';

export class CanvasDrawContext implements DrawContext {
  #ctx: CanvasRenderingContext2D;

  constructor(ctx: CanvasRenderingContext2D) {
    this.#ctx = ctx;
  }

  save() {
    this.#ctx.save();
  }

  restore() {
    this.#ctx.restore();
  }

  transform(a: number, b: number, c: number, d: number, e: number, f: number) {
    this.#ctx.transform(a, b, c, d, e, f);
  }

  setFill(style: string) {
    this.#ctx.fillStyle = style;
  }

  setStroke(style: string) {
    this.#ctx.strokeStyle = style;
  }

  setLineWidth(width: number) {
    this.#ctx.lineWidth = width;
  }

  setFont(font: string) {
    this.#ctx.font = font;
  }

  fill(path: Path) {
    this.#trace(path);
    this.#ctx.fill();
  }

  stroke(path: Path) {
    this.#trace(path);
    this.#ctx.stroke();
  }

  text(
    content: string,
    x: number,
    y: number,
    opts?: { align?: 'left' | 'center' | 'right'; baseline?: 'top' | 'middle' | 'bottom' },
  ) {
    if (opts?.align) {
      this.#ctx.textAlign = opts.align;
    }
    if (opts?.baseline) {
      this.#ctx.textBaseline = opts.baseline;
    }
    this.#ctx.fillText(content, x, y);
  }

  #trace(path: Path) {
    this.#ctx.beginPath();
    for (const c of path.commands) {
      switch (c.type) {
        case 'M':
          this.#ctx.moveTo(c.x, c.y);
          break;
        case 'L':
          this.#ctx.lineTo(c.x, c.y);
          break;
        case 'C':
          this.#ctx.bezierCurveTo(c.cx1, c.cy1, c.cx2, c.cy2, c.x, c.y);
          break;
        case 'A':
          this.#ctx.arc(c.cx, c.cy, c.r, c.a0, c.a1, c.ccw);
          break;
        case 'Z':
          this.#ctx.closePath();
          break;
      }
    }
  }
}
```

- [ ] **Step 4: Run tests**

Run: `moon run graph-engine:test -- src/backend/canvas/canvas-draw-context.test.ts`
Expected: PASS — 2 tests.

- [ ] **Step 5: Commit**

```bash
git add packages/common/graph-engine/src
git commit -m "feat(graph-engine): Canvas DrawContext adapter

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 18: CanvasBackend

**Files:**

- Create: `packages/common/graph-engine/src/backend/canvas/canvas-backend.ts`
- Modify: `packages/common/graph-engine/src/index.ts`

- [ ] **Step 1: Implement canvas-backend.ts**

```ts
//
// Copyright 2026 DXOS.org
//

import { invariant } from '@dxos/invariant';

import { type RenderBackend } from '../render-backend';
import { CanvasDrawContext } from './canvas-draw-context';

/**
 * Drives a <canvas> element. Handles HiDPI scaling.
 */
export class CanvasBackend implements RenderBackend {
  #canvas: HTMLCanvasElement;
  #ctx: CanvasRenderingContext2D;
  #drawContext: CanvasDrawContext;
  #dpr = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.#canvas = canvas;
    const ctx = canvas.getContext('2d');
    invariant(ctx, 'Canvas 2D context unavailable');
    this.#ctx = ctx;
    this.#drawContext = new CanvasDrawContext(ctx);
  }

  resize(width: number, height: number, dpr: number) {
    this.#dpr = dpr;
    this.#canvas.width = Math.floor(width * dpr);
    this.#canvas.height = Math.floor(height * dpr);
    this.#canvas.style.width = `${width}px`;
    this.#canvas.style.height = `${height}px`;
  }

  begin() {
    const { width, height } = this.#canvas;
    this.#ctx.setTransform(this.#dpr, 0, 0, this.#dpr, 0, 0);
    this.#ctx.clearRect(0, 0, width, height);
    return this.#drawContext;
  }

  end() {
    // No-op for 2D context — pixels are committed.
  }
}
```

- [ ] **Step 2: Update index**

```ts
export * from './backend/canvas/canvas-backend';
export * from './backend/canvas/canvas-draw-context';
```

- [ ] **Step 3: Verify build**

Run: `moon run graph-engine:build --quiet 2>&1 | tail -10`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add packages/common/graph-engine/src
git commit -m "feat(graph-engine): CanvasBackend driver with HiDPI handling

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 19: Model adapter

**Files:**

- Create: `packages/common/graph-engine/src/model/model-adapter.ts`
- Modify: `packages/common/graph-engine/src/index.ts`

- [ ] **Step 1: Implement model-adapter.ts**

```ts
//
// Copyright 2026 DXOS.org
//

import { type Graph, type GraphModel } from '@dxos/graph';

/**
 * Subscribe to a ReactiveGraphModel; returns an unsubscribe.
 */
export const subscribeModel = <N extends Graph.Node.Any, E extends Graph.Edge.Any>(
  model: GraphModel.ReactiveGraphModel<N, E>,
  onChange: (graph: Graph.Graph<N, E>) => void,
): (() => void) => {
  // Fire once so the engine sees current state.
  onChange(model.graph);
  return model.subscribe(() => onChange(model.graph));
};
```

- [ ] **Step 2: Update index**

```ts
export * from './model/model-adapter';
```

- [ ] **Step 3: Verify build**

Run: `moon run graph-engine:build --quiet 2>&1 | tail -10`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add packages/common/graph-engine/src
git commit -m "feat(graph-engine): ReactiveGraphModel adapter

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 20: Engine

**Files:**

- Create: `packages/common/graph-engine/src/engine.ts`
- Create: `packages/common/graph-engine/src/engine.test.ts`
- Modify: `packages/common/graph-engine/src/index.ts`

- [ ] **Step 1: Write the failing test**

```ts
//
// Copyright 2026 DXOS.org
//

import { Registry } from '@effect-atom/atom-react';
import { describe, test, vi } from 'vitest';

import { GraphModel } from '@dxos/graph';

import { ForceProjector } from './projector/force-projector';
import { TypeRegistry } from './registry/type-registry';
import { Engine } from './engine';

describe('Engine', () => {
  test('binds model and projects nodes', ({ expect }) => {
    const registry = Registry.make();
    const model = new GraphModel.ReactiveGraphModel(registry);
    model.addNode({ id: 'a' });
    model.addNode({ id: 'b' });
    model.addEdge({ source: 'a', target: 'b' });

    const engine = new Engine({
      model,
      registry: new TypeRegistry(),
      projector: new ForceProjector(),
    });
    engine.start();
    expect(engine.layout.nodes).toHaveLength(2);
    engine.stop();
  });

  test('re-projects on model change', ({ expect }) => {
    const registry = Registry.make();
    const model = new GraphModel.ReactiveGraphModel(registry);
    model.addNode({ id: 'a' });

    const engine = new Engine({
      model,
      registry: new TypeRegistry(),
      projector: new ForceProjector(),
    });
    engine.start();
    model.addNode({ id: 'b' });
    expect(engine.layout.nodes).toHaveLength(2);
    engine.stop();
  });

  test('hitTest returns node under world coordinate', ({ expect }) => {
    const registry = Registry.make();
    const model = new GraphModel.ReactiveGraphModel(registry);
    model.addNode({ id: 'a' });

    const engine = new Engine({
      model,
      registry: new TypeRegistry(),
      projector: new ForceProjector(),
    });
    engine.start();
    const node = engine.layout.nodes[0];
    node.x = 50;
    node.y = 50;
    node.r = 10;
    engine.viewport.setSize({ width: 200, height: 200 });
    const hit = engine.hitTestWorld(50, 50);
    expect(hit?.kind).toBe('node');
    engine.stop();
  });
});
```

- [ ] **Step 2: Run test to confirm failure**

Run: `moon run graph-engine:test -- src/engine.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement engine.ts**

```ts
//
// Copyright 2026 DXOS.org
//

import { EventEmitter } from '@dxos/async';
import { type Graph, type GraphModel } from '@dxos/graph';

import { type RenderBackend } from './backend/render-backend';
import { subscribeModel } from './model/model-adapter';
import { type Projector } from './projector/projector';
import { type EdgeHandler, type EngineHandle, type NodeHandler } from './registry/handlers';
import { type TypeRegistry } from './registry/type-registry';
import { StraightRouter } from './router/straight-router';
import { type EdgeRouter } from './router/router';
import { type EntityHit, type Tool } from './tool/tool';
import { TweenService } from './tween/tween-service';
import { type LayoutEdge, type LayoutGraph, type LayoutNode } from './types';
import { Viewport } from './viewport';

export type EngineOptions<N extends Graph.Node.Any, E extends Graph.Edge.Any> = {
  model: GraphModel.ReactiveGraphModel<N, E>;
  registry: TypeRegistry;
  projector: Projector;
  backend?: RenderBackend;
  tools?: Tool[];
};

/**
 * Top-level engine — owns model subscription, projector, tween, tools, viewport, backend.
 */
export class Engine<N extends Graph.Node.Any = any, E extends Graph.Edge.Any = any> implements EngineHandle {
  readonly model: GraphModel.ReactiveGraphModel<N, E>;
  readonly registry: TypeRegistry;
  readonly projector: Projector;
  readonly viewport = new Viewport();
  readonly tween = new TweenService();
  readonly frame = new EventEmitter<{ t: number }>();

  #backend?: RenderBackend;
  #tools: Tool[];
  #detachTools: Array<() => void> = [];
  #unsubscribeModel?: () => void;
  #rafHandle?: number;
  #routers = new Map<string, EdgeRouter>([['straight', new StraightRouter()]]);
  #frontIslands = new Set<string>();
  #started = false;

  constructor(opts: EngineOptions<N, E>) {
    this.model = opts.model;
    this.registry = opts.registry;
    this.projector = opts.projector;
    this.#backend = opts.backend;
    this.#tools = opts.tools ?? [];
  }

  get layout(): LayoutGraph {
    return this.projector.layout;
  }

  setBackend(backend: RenderBackend | undefined) {
    this.#backend = backend;
  }

  attachTools(target: EventTarget) {
    for (const tool of this.#tools) {
      this.#detachTools.push(tool.attach(this, target));
    }
  }

  detachTools() {
    for (const d of this.#detachTools) {
      d();
    }
    this.#detachTools = [];
  }

  start() {
    if (this.#started) {
      return;
    }
    this.#started = true;
    this.#unsubscribeModel = subscribeModel(this.model, (g) => this.projector.updateData(g));
    this.projector.start();
    this.#loop(performance.now());
  }

  stop() {
    this.#started = false;
    if (this.#rafHandle !== undefined && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(this.#rafHandle);
    }
    this.#unsubscribeModel?.();
    this.projector.stop();
  }

  hitTestWorld(wx: number, wy: number): EntityHit {
    for (let i = this.layout.nodes.length - 1; i >= 0; i--) {
      const node = this.layout.nodes[i];
      const handler = this.registry.resolveNode(node as N);
      if (handler.hit([wx, wy], node)) {
        return { kind: 'node', node: node as LayoutNode };
      }
    }
    for (let i = this.layout.edges.length - 1; i >= 0; i--) {
      const edge = this.layout.edges[i];
      const handler = this.registry.resolveEdge(edge as unknown as E);
      const path = this.#routeEdge(edge, handler);
      if (handler.hit([wx, wy], edge, path)) {
        return { kind: 'edge', edge: edge as LayoutEdge };
      }
    }
    return undefined;
  }

  hitTest(screenX: number, screenY: number): EntityHit {
    const [wx, wy] = this.viewport.screenToWorld([screenX, screenY]);
    return this.hitTestWorld(wx, wy);
  }

  emitFrame() {
    this.frame.emit({ t: performance.now() });
  }

  bringToFront(islandId: string) {
    this.#frontIslands.add(islandId);
  }

  routeEdge(edge: LayoutEdge) {
    const handler = this.registry.resolveEdge(edge as unknown as E);
    return this.#routeEdge(edge, handler);
  }

  #routeEdge(edge: LayoutEdge, handler: EdgeHandler) {
    const router =
      typeof handler.router === 'string' ? (this.#routers.get(handler.router) ?? new StraightRouter()) : handler.router;
    return router.route(edge);
  }

  #loop(t: number) {
    if (!this.#started) {
      return;
    }
    const more = this.projector.tick(t);
    this.tween.advance(t);
    this.viewport.tick(t);

    if (this.#backend) {
      const ctx = this.#backend.begin();
      this.#renderLayers(ctx);
      this.#backend.end();
    }

    this.frame.emit({ t });

    if (typeof requestAnimationFrame !== 'undefined') {
      this.#rafHandle = requestAnimationFrame((next) => this.#loop(next));
    }
  }

  #renderLayers(ctx: import('./draw/draw-context').DrawContext) {
    // Layer 1 — edges.
    for (const edge of this.layout.edges) {
      const handler = this.registry.resolveEdge(edge as unknown as E);
      const path = this.#routeEdge(edge, handler);
      handler.draw(ctx, edge, path, this.viewport);
    }
    // Layer 2 — nodes.
    for (const node of this.layout.nodes) {
      const handler = this.registry.resolveNode(node as N) as NodeHandler;
      handler.draw(ctx, node, this.viewport);
    }
  }
}
```

- [ ] **Step 4: Update index**

```ts
export * from './engine';
```

- [ ] **Step 5: Run tests**

Run: `moon run graph-engine:test -- src/engine.test.ts`
Expected: PASS — 3 tests.

- [ ] **Step 6: Commit**

```bash
git add packages/common/graph-engine/src
git commit -m "feat(graph-engine): Engine wiring model, projector, tween, tools, backend

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 21: React v2 scaffolding — context + useEngine

**Files:**

- Create: `packages/ui/react-ui-graph/src/v2/context.ts`
- Create: `packages/ui/react-ui-graph/src/v2/hooks/use-engine.ts`
- Create: `packages/ui/react-ui-graph/src/v2/hooks/use-viewport.ts`
- Create: `packages/ui/react-ui-graph/src/v2/hooks/use-selection.ts`
- Create: `packages/ui/react-ui-graph/src/v2/index.ts`
- Modify: `packages/ui/react-ui-graph/src/index.ts`
- Modify: `packages/ui/react-ui-graph/package.json` (add `@dxos/graph-engine: workspace:*`).

- [ ] **Step 1: Add dependency**

Edit `packages/ui/react-ui-graph/package.json` → `dependencies`: add `"@dxos/graph-engine": "workspace:*"`. Then:

Run: `pnpm install --filter @dxos/react-ui-graph`

- [ ] **Step 2: Implement context.ts**

```ts
//
// Copyright 2026 DXOS.org
//

import { createContext, useContext } from 'react';

import { type Engine } from '@dxos/graph-engine';
import { raise } from '@dxos/debug';

const EngineContext = createContext<Engine | undefined>(undefined);

export const EngineContextProvider = EngineContext.Provider;

export const useEngineContext = (): Engine => useContext(EngineContext) ?? raise(new Error('Missing <GraphRoot>'));
```

- [ ] **Step 3: Implement use-engine.ts**

```ts
//
// Copyright 2026 DXOS.org
//

import { useEffect, useMemo } from 'react';

import {
  Engine,
  type EngineOptions,
  ForceProjector,
  HoverTool,
  SelectTool,
  TypeRegistry,
  ZoomTool,
} from '@dxos/graph-engine';
import { type Graph } from '@dxos/graph';

export type UseEngineOptions<N extends Graph.Node.Any, E extends Graph.Edge.Any> = Partial<EngineOptions<N, E>> &
  Pick<EngineOptions<N, E>, 'model'>;

export const useEngine = <N extends Graph.Node.Any = Graph.Node.Any, E extends Graph.Edge.Any = Graph.Edge.Any>(
  opts: UseEngineOptions<N, E>,
): Engine<N, E> => {
  const engine = useMemo(() => {
    const registry = opts.registry ?? new TypeRegistry();
    const projector = opts.projector ?? new ForceProjector();
    const engine = new Engine<N, E>({ model: opts.model, registry, projector });
    engine.viewport;
    return engine;
  }, [opts.model]);

  useEffect(() => {
    const hover = new HoverTool((e) => {
      const handler = engine.registry.resolveNode({ id: e.entityId, type: undefined } as any) ?? undefined;
      handler?.onPointer?.(e, { id: e.entityId } as any, engine);
    });
    const select = new SelectTool(() => {});
    const zoom = new ZoomTool(engine.viewport);
    return () => {
      engine.detachTools();
    };
  }, [engine]);

  return engine;
};
```

- [ ] **Step 4: Implement use-viewport.ts**

```ts
//
// Copyright 2026 DXOS.org
//

import { useEffect, useState } from 'react';

import { useEngineContext } from '../context';

export const useViewport = () => {
  const engine = useEngineContext();
  const [state, setState] = useState({
    size: engine.viewport.size,
    scale: engine.viewport.scale,
  });
  useEffect(() => {
    const offResize = engine.viewport.resized.on((size) => setState((s) => ({ ...s, size })));
    const offTransform = engine.viewport.transformed.on((t) => setState((s) => ({ ...s, scale: t.k })));
    return () => {
      offResize();
      offTransform();
    };
  }, [engine]);
  return state;
};
```

- [ ] **Step 5: Implement use-selection.ts (read-only stub)**

```ts
//
// Copyright 2026 DXOS.org
//

import { useState } from 'react';

/** Phase 1 stub — full selection wiring comes with DragTool in Phase 2. */
export const useSelection = (): Set<string> => {
  const [ids] = useState(() => new Set<string>());
  return ids;
};
```

- [ ] **Step 6: Implement v2/index.ts**

```ts
//
// Copyright 2026 DXOS.org
//

export * from './context';
export * from './hooks/use-engine';
export * from './hooks/use-viewport';
export * from './hooks/use-selection';
```

- [ ] **Step 7: Extend package barrel**

In `packages/ui/react-ui-graph/src/index.ts`, append:

```ts
export * as v2 from './v2';
```

- [ ] **Step 8: Build**

Run: `moon run react-ui-graph:build --quiet 2>&1 | tail -10`
Expected: build succeeds.

- [ ] **Step 9: Commit**

```bash
git add packages/ui/react-ui-graph/src/v2 packages/ui/react-ui-graph/src/index.ts packages/ui/react-ui-graph/package.json pnpm-lock.yaml
git commit -m "feat(react-ui-graph): v2 scaffolding with EngineContext and hooks

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 22: GraphRoot component

**Files:**

- Create: `packages/ui/react-ui-graph/src/v2/GraphRoot.tsx`
- Modify: `packages/ui/react-ui-graph/src/v2/index.ts`

- [ ] **Step 1: Implement GraphRoot.tsx**

```tsx
//
// Copyright 2026 DXOS.org
//

import React, { type PropsWithChildren, useEffect, useRef, useState } from 'react';

import { type Engine } from '@dxos/graph-engine';
import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { EngineContextProvider } from './context';

export type GraphRootProps = ThemedClassName<PropsWithChildren<{ engine: Engine }>>;

/**
 * Provides EngineContext and a sized container. Owns the ResizeObserver.
 */
export const GraphRoot = ({ engine, classNames, children }: GraphRootProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }
    const rect = el.getBoundingClientRect();
    setSize({ width: rect.width, height: rect.height });
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (size.width && size.height) {
      engine.viewport.setSize(size);
    }
  }, [engine, size.width, size.height]);

  return (
    <EngineContextProvider value={engine}>
      <div ref={ref} className={mx('relative w-full h-full overflow-hidden', classNames)}>
        {children}
      </div>
    </EngineContextProvider>
  );
};
```

- [ ] **Step 2: Update v2/index.ts**

```ts
export * from './GraphRoot';
```

- [ ] **Step 3: Build**

Run: `moon run react-ui-graph:build --quiet 2>&1 | tail -10`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add packages/ui/react-ui-graph/src/v2
git commit -m "feat(react-ui-graph): v2 GraphRoot with ResizeObserver

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 23: GraphSurface (Canvas)

**Files:**

- Create: `packages/ui/react-ui-graph/src/v2/GraphSurface.tsx`
- Modify: `packages/ui/react-ui-graph/src/v2/index.ts`

- [ ] **Step 1: Implement GraphSurface.tsx**

```tsx
//
// Copyright 2026 DXOS.org
//

import React, { useEffect, useRef } from 'react';

import { CanvasBackend, HoverTool, SelectTool, ZoomTool, type SemanticPointerEvent } from '@dxos/graph-engine';

import { useEngineContext } from './context';

export type GraphSurfaceProps = {
  className?: string;
  onSemanticEvent?: (event: SemanticPointerEvent) => void;
};

export const GraphSurface = ({ className, onSemanticEvent }: GraphSurfaceProps) => {
  const engine = useEngineContext();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const backend = new CanvasBackend(canvas);
    engine.setBackend(backend);

    const dpr = window.devicePixelRatio ?? 1;
    const offResize = engine.viewport.resized.on((s) => backend.resize(s.width, s.height, dpr));
    if (engine.viewport.size.width) {
      backend.resize(engine.viewport.size.width, engine.viewport.size.height, dpr);
    }

    const emit = (e: SemanticPointerEvent) => onSemanticEvent?.(e);
    const hover = new HoverTool(emit);
    const select = new SelectTool(emit);
    const zoom = new ZoomTool(engine.viewport);

    const detach = [hover.attach(engine, canvas), select.attach(engine, canvas), zoom.attach(engine, canvas)];

    engine.start();

    return () => {
      detach.forEach((fn) => fn());
      engine.stop();
      engine.setBackend(undefined);
      offResize();
    };
  }, [engine, onSemanticEvent]);

  return <canvas ref={canvasRef} className={className} />;
};
```

- [ ] **Step 2: Update v2/index.ts**

```ts
export * from './GraphSurface';
```

- [ ] **Step 3: Build**

Run: `moon run react-ui-graph:build --quiet 2>&1 | tail -10`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add packages/ui/react-ui-graph/src/v2
git commit -m "feat(react-ui-graph): v2 GraphSurface with Canvas backend

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 24: HtmlOverlayLayer

**Files:**

- Create: `packages/ui/react-ui-graph/src/v2/HtmlOverlayLayer.tsx`
- Modify: `packages/ui/react-ui-graph/src/v2/index.ts`

- [ ] **Step 1: Implement HtmlOverlayLayer.tsx**

```tsx
//
// Copyright 2026 DXOS.org
//

import React, { type ReactNode, useEffect, useRef, useState } from 'react';

import { type LayoutEdge, type LayoutNode, type Point, rectContains } from '@dxos/graph-engine';

import { useEngineContext } from './context';

type IslandEntry = {
  id: string;
  ref: React.RefObject<HTMLDivElement>;
  node: ReactNode;
};

const anchorPoint = (anchor: any, node: LayoutNode): Point => {
  if (anchor === 'top') {
    return [node.x ?? 0, (node.y ?? 0) - (node.r ?? 0)];
  }
  if (anchor === 'bottom') {
    return [node.x ?? 0, (node.y ?? 0) + (node.r ?? 0)];
  }
  if (anchor && typeof anchor === 'object' && 'offset' in anchor) {
    return [(node.x ?? 0) + anchor.offset[0], (node.y ?? 0) + anchor.offset[1]];
  }
  return [node.x ?? 0, node.y ?? 0];
};

/**
 * Renders React HTML islands that track node/edge positions every frame.
 * Position updates rewrite CSS transform imperatively — no React re-render per frame.
 */
export const HtmlOverlayLayer = () => {
  const engine = useEngineContext();
  const [entries, setEntries] = useState<IslandEntry[]>([]);
  const layerRef = useRef<HTMLDivElement>(null);
  const refs = useRef(new Map<string, React.RefObject<HTMLDivElement>>());

  // Reconcile island set when the graph or viewport scale-bucket changes.
  useEffect(() => {
    const reconcile = () => {
      const visible = engine.viewport.visibleBounds();
      const next: IslandEntry[] = [];
      for (const node of engine.layout.nodes) {
        const handler = engine.registry.resolveNode(node as any);
        const island = handler.island;
        if (!island) {
          continue;
        }
        if (island.show && !island.show(engine.viewport)) {
          continue;
        }
        const [ax, ay] = anchorPoint(island.anchor, node as LayoutNode);
        const inside = rectContains(
          { x: visible.x - 50, y: visible.y - 50, width: visible.width + 100, height: visible.height + 100 },
          [ax, ay],
        );
        if (!inside) {
          continue;
        }
        const id = `node:${node.id}`;
        let ref = refs.current.get(id);
        if (!ref) {
          ref = React.createRef<HTMLDivElement>();
          refs.current.set(id, ref);
        }
        next.push({
          id,
          ref,
          node: (
            <div
              key={id}
              ref={ref}
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                pointerEvents: island.passthrough ? 'none' : 'auto',
                willChange: 'transform',
              }}
            >
              {island.render(node as LayoutNode, engine.viewport, engine)}
            </div>
          ),
        });
      }

      for (const edge of engine.layout.edges) {
        const handler = engine.registry.resolveEdge(edge as any);
        const island = handler.island;
        if (!island) {
          continue;
        }
        if (island.show && !island.show(engine.viewport)) {
          continue;
        }
        const path = engine.routeEdge(edge as LayoutEdge);
        const id = `edge:${edge.id}`;
        let ref = refs.current.get(id);
        if (!ref) {
          ref = React.createRef<HTMLDivElement>();
          refs.current.set(id, ref);
        }
        next.push({
          id,
          ref,
          node: (
            <div
              key={id}
              ref={ref}
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                pointerEvents: island.passthrough ? 'none' : 'auto',
                willChange: 'transform',
              }}
            >
              {island.render(edge as LayoutEdge, path, engine.viewport, engine)}
            </div>
          ),
        });
      }
      setEntries(next);
    };

    reconcile();
    return engine.frame.on(() => {
      // Reconcile is debounced via scale-bucket — for Phase 1 just reconcile each frame; perf TBD next phase.
      reconcile();
    });
  }, [engine]);

  // Per-frame position update — imperative, no React reconciliation.
  useEffect(() => {
    return engine.frame.on(() => {
      for (const entry of entries) {
        const ref = entry.ref.current;
        if (!ref) {
          continue;
        }
        const [kind, rawId] = entry.id.split(':');
        if (kind === 'node') {
          const node = engine.layout.nodes.find((n) => n.id === rawId);
          if (!node) {
            continue;
          }
          const handler = engine.registry.resolveNode(node as any);
          const [ax, ay] = anchorPoint(handler.island?.anchor, node as LayoutNode);
          const [sx, sy] = engine.viewport.worldToScreen([ax, ay]);
          const scaling = handler.island?.scaling ?? 'fixed-pixel';
          const k = scaling === 'world' ? engine.viewport.scale : 1;
          ref.style.transform = `translate(${sx}px, ${sy}px) scale(${k})`;
        } else {
          const edge = engine.layout.edges.find((e) => e.id === rawId);
          if (!edge) {
            continue;
          }
          const handler = engine.registry.resolveEdge(edge as any);
          const path = engine.routeEdge(edge as LayoutEdge);
          const anchor = handler.island?.anchor ?? 'midpoint';
          let pt: Point;
          if (anchor === 'midpoint') {
            pt = engine.routeEdge(edge as LayoutEdge).commands.length
              ? // labelPoint via straight router only in Phase 1
                ((handler.router === 'straight'
                  ? [
                      (path.commands[0] as any).x + ((path.commands[1] as any).x - (path.commands[0] as any).x) * 0.5,
                      (path.commands[0] as any).y + ((path.commands[1] as any).y - (path.commands[0] as any).y) * 0.5,
                    ]
                  : [0, 0]) as Point)
              : [0, 0];
          } else if (typeof anchor === 'function') {
            pt = anchor(path);
          } else if (typeof anchor === 'object' && 't' in anchor) {
            pt = [
              (path.commands[0] as any).x + ((path.commands[1] as any).x - (path.commands[0] as any).x) * anchor.t,
              (path.commands[0] as any).y + ((path.commands[1] as any).y - (path.commands[0] as any).y) * anchor.t,
            ];
          } else {
            pt = [0, 0];
          }
          const [sx, sy] = engine.viewport.worldToScreen(pt);
          const scaling = handler.island?.scaling ?? 'fixed-pixel';
          const k = scaling === 'world' ? engine.viewport.scale : 1;
          ref.style.transform = `translate(${sx}px, ${sy}px) scale(${k})`;
        }
      }
    });
  }, [engine, entries]);

  return (
    <div
      ref={layerRef}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
      }}
    >
      {entries.map((e) => e.node)}
    </div>
  );
};
```

- [ ] **Step 2: Update v2/index.ts**

```ts
export * from './HtmlOverlayLayer';
```

- [ ] **Step 3: Build**

Run: `moon run react-ui-graph:build --quiet 2>&1 | tail -10`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add packages/ui/react-ui-graph/src/v2
git commit -m "feat(react-ui-graph): v2 HtmlOverlayLayer with imperative transforms

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 25: Storybook example

**Files:**

- Create: `packages/ui/react-ui-graph/src/v2/stories/Phase1.stories.tsx`

- [ ] **Step 1: Implement Phase1.stories.tsx**

```tsx
//
// Copyright 2026 DXOS.org
//

import { RegistryContext } from '@effect-atom/atom-react';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useContext, useMemo, useState } from 'react';

import { GraphModel } from '@dxos/graph';
import { ForceProjector, TypeRegistry, createPath, type SemanticPointerEvent } from '@dxos/graph-engine';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { withRegistry } from '@dxos/storybook-utils';
import { mx } from '@dxos/ui-theme';

import { GraphRoot } from '../GraphRoot';
import { GraphSurface } from '../GraphSurface';
import { HtmlOverlayLayer } from '../HtmlOverlayLayer';
import { useEngine } from '../hooks/use-engine';

type Person = { name: string };

const buildModel = (registry: ReturnType<typeof useContext<typeof RegistryContext>>) => {
  const model = new GraphModel.ReactiveGraphModel(registry);
  ['alice', 'bob', 'carol', 'dave', 'eve'].forEach((id) => model.addNode({ id, type: 'person', data: { name: id } }));
  model.addEdge({ source: 'alice', target: 'bob' });
  model.addEdge({ source: 'alice', target: 'carol' });
  model.addEdge({ source: 'bob', target: 'dave' });
  model.addEdge({ source: 'carol', target: 'eve' });
  return model;
};

const Phase1Story = () => {
  const registry = useContext(RegistryContext);
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const model = useMemo(() => buildModel(registry), [registry]);

  const typeRegistry = useMemo(() => {
    const r = new TypeRegistry<Person>();
    r.registerNode('person', {
      draw(ctx, node) {
        const r = node.r ?? 12;
        const x = node.x ?? 0;
        const y = node.y ?? 0;
        ctx.save();
        const p = createPath();
        p.arc(x, y, r, 0, Math.PI * 2);
        ctx.setFill('#3b82f6');
        ctx.fill(p);
        ctx.setStroke('#1e3a8a');
        ctx.setLineWidth(1.5);
        ctx.stroke(p);
        ctx.restore();
      },
      bounds(node) {
        const r = node.r ?? 12;
        return { x: (node.x ?? 0) - r, y: (node.y ?? 0) - r, width: r * 2, height: r * 2 };
      },
      hit([px, py], node) {
        const r = node.r ?? 12;
        const dx = (node.x ?? 0) - px;
        const dy = (node.y ?? 0) - py;
        return dx * dx + dy * dy <= r * r;
      },
      capabilities: { hoverable: true, selectable: true },
      island: {
        anchor: { offset: [16, -16] },
        scaling: 'fixed-pixel',
        passthrough: false,
        render(node) {
          return (
            <div
              className={mx(
                'px-2 py-1 rounded bg-white shadow text-xs',
                selectedId === node.id && 'ring-2 ring-blue-500',
              )}
            >
              {node.data?.name ?? node.id}
            </div>
          );
        },
      },
    });
    return r;
  }, [selectedId]);

  const projector = useMemo(() => new ForceProjector({ linkDistance: 80 }), []);
  const engine = useEngine({ model, registry: typeRegistry, projector });

  const onSemanticEvent = (e: SemanticPointerEvent) => {
    if (e.type === 'select') {
      setSelectedId(e.entityId);
    }
  };

  return (
    <div className='w-full h-[600px] bg-neutral-50'>
      <GraphRoot engine={engine}>
        <GraphSurface className='absolute inset-0' onSemanticEvent={onSemanticEvent} />
        <HtmlOverlayLayer />
      </GraphRoot>
    </div>
  );
};

const meta: Meta = {
  title: 'react-ui-graph/v2/Phase1',
  decorators: [withRegistry, withTheme, withLayout({ fullscreen: true })],
};
export default meta;

type Story = StoryObj;
export const ForceWithIslands: Story = { render: () => <Phase1Story /> };
```

- [ ] **Step 2: Run storybook locally and inspect**

Run: `moon run react-ui-graph:storybook --quiet`
Open the URL printed by Storybook (default `:9009`); navigate to `react-ui-graph/v2/Phase1 → ForceWithIslands`.

Expected:

- Nodes appear and animate into a force layout.
- Each node has a labeled HTML island that tracks during animation.
- Clicking a node ring-highlights its island.
- Mouse-wheel zoom and drag-pan work; islands stay fixed-pixel size at all zoom levels.

- [ ] **Step 3: Commit**

```bash
git add packages/ui/react-ui-graph/src/v2/stories
git commit -m "feat(react-ui-graph): v2 Phase1 story with force layout and islands

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 26: Final integration check

- [ ] **Step 1: Lint & format**

Run: `moon run graph-engine:lint -- --fix && moon run react-ui-graph:lint -- --fix`
Expected: clean.

- [ ] **Step 2: Full test sweep**

Run: `moon run graph-engine:test`
Expected: all tests pass.

Run: `moon run react-ui-graph:test`
Expected: all v1 tests still pass (v2 has no vitest tests; storybook is the harness).

- [ ] **Step 3: Build everything affected**

Run: `moon run graph-engine:build && moon run react-ui-graph:build`
Expected: both succeed.

- [ ] **Step 4: Walk the DX evaluation checklist**

For each item in [DESIGN.md](./DESIGN.md) §Phase 1 "DX evaluation checklist", manually verify in the storybook or by adding a temporary scratch story. Note any rough edges in a new `docs/PHASE1-FEEDBACK.md` (not part of this plan — discoveries inform Phase 2).

- [ ] **Step 5: Commit any small follow-up fixes if needed**

If walking the checklist surfaces small bugs (typos, missing exports), fix and commit:

```bash
git add -p
git commit -m "fix(graph-engine|react-ui-graph): <specifics>

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step 6: Push and open PR**

```bash
git push -u origin claude/kind-shirley-2ccca0
gh pr create --title "feat: react-ui-graph v2 Phase 1 (graph-engine + Canvas backend + HTML islands)" --body "$(cat <<'EOF'
## Summary
- New @dxos/graph-engine package: registry, projector, tween, tools, viewport, Canvas backend
- react-ui-graph v2 under src/v2/: GraphRoot, GraphSurface, HtmlOverlayLayer + hooks
- Storybook example exercising force layout + per-node React HTML islands

## Design
See packages/ui/react-ui-graph/docs/DESIGN.md and PHASE1-PLAN.md.

## Test plan
- [ ] graph-engine unit tests (`moon run graph-engine:test`) green
- [ ] react-ui-graph v1 tests still pass (`moon run react-ui-graph:test`)
- [ ] Storybook story `react-ui-graph/v2/Phase1 → ForceWithIslands` renders nodes, islands, animates layout, supports hover/click/zoom

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-Review Notes (post-write check)

Spec coverage check:

- §Architecture overview → Tasks 1, 9, 11, 12, 16, 18, 19, 20.
- §Surface composition (layers 0–4) → Layer 0 deferred (no background layer in Phase 1, noted in DESIGN §Phase 1 out-of-scope); Layers 1–2 via Task 20 `#renderLayers`; Layer 3 via Task 24; Layer 4 deferred (no drag preview yet — Phase 2).
- §Frame loop → Task 20 `#loop`.
- §Type Registry → Tasks 7, 8.
- §HTML islands → Tasks 7 (types), 24 (overlay). Viewport culling, scaling modes, passthrough, show all in Task 24.
- §Projector & EdgeRouter contracts → Tasks 9, 10, 11.
- §TweenService → Task 6.
- §Tools → Tasks 12–15.
- §Viewport → Task 5.
- §React API → Tasks 21–24.
- §DX evaluation checklist → Task 26 step 4 + storybook in Task 25.

Type consistency: `Engine` is referenced as `EngineHandle` in handler types (Task 7) and `Engine` extends `EngineHandle` (Task 20). Method names match across tasks (`hitTest`, `hitTestWorld`, `setBackend`, `setTransform`, `setSize`, `setTarget`, `read`, `advance`, `isAnimating`).

Placeholder scan: none. Every step has either complete code or a concrete command + expected outcome.

Known fragile area to call out for the implementer: Task 21's `useEngine` currently constructs tools but does not attach them — `GraphSurface` (Task 23) is the canonical place tools attach because they need the canvas element. The unused locals in Task 21's `useEffect` may produce lint warnings — drop them if they do.
