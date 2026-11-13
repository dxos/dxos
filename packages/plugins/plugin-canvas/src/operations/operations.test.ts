//
// Copyright 2026 DXOS.org
//

import { it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import { describe } from 'vitest';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import * as Operation from '@dxos/compute/Operation';
import { Database, Obj, Ref } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import { DEFAULT_LATTICE } from '@dxos/react-ui-canvas';
import { Scene } from '@dxos/scene';

import { addCanvas, openScene, readViews, rootOf } from '#model';
import { CanvasOperationHandlerSet } from '#operations';
import { Canvas, CanvasOperation } from '#types';

import schemaTypes from '../capabilities/schema.ts';
import { migrateLegacyDrawings } from '../model/legacy-migration.ts';
import { makeLegacyCanvas } from '../testing/legacy-drawing.ts';

const TestLayer = AssistantTestLayer({
  operationHandlers: CanvasOperationHandlerSet.handlers,
  types: [Drawing.Drawing, Drawing.Canvas, ...schemaTypes],
  disableLlmMemoization: true,
});

const SOURCE = `
  import { defineGenerator, orbit } from '@dxos/react-ui-canvas/motion';
  export default defineGenerator<{ count: number }>({
    sample: (ctx) =>
      Array.from({ length: ctx.params.count }, (_, index) => ({
        kind: 'circle',
        center: orbit({ x: 0, y: 0 }, { radius: 50, period: 2, phase: index })(ctx.t).position,
        radius: 2,
      })),
  });
`;

describe('canvas generator operations', () => {
  it.effect(
    'create, place and check a generator on a canvas the space-load migration made from a legacy drawing',
    Effect.fnUntraced(
      function* ({ expect }) {
        const legacy = yield* Database.add(makeLegacyCanvas());
        const drawing = yield* Database.add(Drawing.make({ name: 'Test', canvas: legacy }));
        yield* Database.flush();
        expect(yield* migrateLegacyDrawings()).toMatchObject({ migrated: 1 });

        const created = yield* Operation.invoke(CanvasOperation.CreateGenerator, { name: 'Orbit', source: SOURCE });
        expect(created.errors).toBeUndefined();
        expect(created.version).toBe(1);

        const { node } = yield* Operation.invoke(CanvasOperation.AddGenerator, {
          drawing: Ref.make(drawing),
          generator: created.generator,
          bounds: { x: -100, y: -100, width: 200, height: 200 },
          params: { count: 3 },
        });
        const migrated = drawing.canvas.target;
        const layout = Canvas.isCanvas(migrated) ? openScene(migrated)?.layout.target : undefined;
        if (!Obj.instanceOf(Scene.Layout2D, layout)) {
          throw new Error('The legacy drawing was migrated onto a scene canvas.');
        }
        expect(layout.elements[node]).toMatchObject({ type: 'generator' });
        expect(readViews(legacy.content)[rootOf(legacy.content) ?? ''].nodes[node]).toBeUndefined();

        const report = yield* Operation.invoke(CanvasOperation.InspectGenerator, {
          generator: created.generator,
          drawing: Ref.make(drawing),
          node,
          times: [0, 1, 2],
        });
        expect(report.deterministic).toBe(true);
        // The placed count draws at every time.
        expect(report.frames).toEqual([0, 1, 2].map((t) => ({ t, shapes: 3 })));

        const updated = yield* Operation.invoke(CanvasOperation.UpdateGenerator, {
          generator: created.generator,
          source: 'export default {',
        });
        expect(updated.version).toBe(2);
        expect(updated.errors?.length).toBeGreaterThan(0);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    60_000,
  );

  it.effect(
    'a generator placed on a scene canvas is an element of the open layout, and checks there',
    Effect.fnUntraced(
      function* ({ expect }) {
        const canvas = yield* addCanvas();
        const drawing = yield* Database.add(Drawing.make({ name: 'Scene', canvas }));
        yield* Database.flush();
        const layout = openScene(canvas)?.layout.target;
        if (!Obj.instanceOf(Scene.Layout2D, layout)) {
          throw new Error('A scene canvas opens a 2D layout.');
        }

        const created = yield* Operation.invoke(CanvasOperation.CreateGenerator, { name: 'Orbit', source: SOURCE });
        const { node } = yield* Operation.invoke(CanvasOperation.AddGenerator, {
          drawing: Ref.make(drawing),
          generator: created.generator,
          bounds: { x: -100, y: -100, width: 200, height: 200 },
          params: { count: 3 },
        });
        expect(layout.elements[node]).toMatchObject({
          type: 'generator',
          center: { x: 0, y: 0 },
          size: { width: 200, height: 200 },
        });

        const report = yield* Operation.invoke(CanvasOperation.InspectGenerator, {
          generator: created.generator,
          drawing: Ref.make(drawing),
          node,
          times: [0, 1],
        });
        expect(report.frames).toEqual([0, 1].map((t) => ({ t, shapes: 3 })));
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    60_000,
  );
});

describe('canvas edit operations', () => {
  it.effect(
    'apply edits a migrated canvas, whose patch undoes it; the legacy canvas it replaced takes no edit',
    Effect.fnUntraced(
      function* ({ expect }) {
        const legacy = yield* Database.add(makeLegacyCanvas());
        const drawing = yield* Database.add(Drawing.make({ name: 'Test', canvas: legacy }));
        yield* Database.flush();
        yield* migrateLegacyDrawings();
        const canvas = drawing.canvas.target;
        if (!Canvas.isCanvas(canvas)) {
          throw new Error('The legacy drawing was migrated onto a scene canvas.');
        }
        const element = { id: 'n', type: 'rect', z: 'a0', center: { x: 0, y: 0 }, size: { width: 64, height: 64 } };

        const refused = yield* Operation.invoke(CanvasOperation.Apply, {
          canvas: Ref.make(legacy),
          intents: [{ kind: 'create', element }],
        }).pipe(Effect.exit);
        expect(refused._tag).toBe('Failure');

        const created = yield* Operation.invoke(CanvasOperation.Apply, {
          canvas: Ref.make(canvas),
          intents: [{ kind: 'create', element }],
        });
        expect(created.canvas).toBe(canvas.id);
        const layout = openScene(canvas)?.layout.target;
        if (!Obj.instanceOf(Scene.Layout2D, layout)) {
          throw new Error('A scene canvas opens a 2D layout.');
        }
        expect(layout.elements.n?.center).toEqual({ x: 0, y: 0 });

        yield* Operation.invoke(CanvasOperation.Patch, {
          canvas: Ref.make(canvas),
          from: created.after,
          to: created.before,
          paths: created.paths,
        });
        expect(layout.elements.n).toBeUndefined();
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    60_000,
  );

  it.effect(
    'a legacy canvas a newer plugin wrote is left unmigrated, and apply refuses it',
    Effect.fnUntraced(
      function* ({ expect }) {
        const canvas = yield* Database.add(makeLegacyCanvas());
        const drawing = yield* Database.add(Drawing.make({ name: 'Test', canvas }));
        Obj.update(canvas, (canvas) => {
          canvas.schema = `dxos.org/scene/${Canvas.SCENE_REVISION + 1}`;
        });
        yield* Database.flush();
        expect(yield* migrateLegacyDrawings()).toMatchObject({ migrated: 0 });
        expect(drawing.canvas.target).toBe(canvas);

        const root = rootOf(canvas.content) ?? '';
        const node = { id: 'n', type: 'rect', z: 'a0', center: { x: 0, y: 0 }, size: { width: 64, height: 64 } };
        const exit = yield* Operation.invoke(CanvasOperation.Apply, {
          canvas: Ref.make(canvas),
          intents: [{ kind: 'create', node }],
        }).pipe(Effect.exit);
        expect(exit._tag).toBe('Failure');
        expect(readViews(canvas.content)[root].nodes.n).toBeUndefined();
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    60_000,
  );

  it.effect(
    "apply snaps a scene canvas's edits to its layout's lattice, and refuses one onto occupied cells",
    Effect.fnUntraced(
      function* ({ expect }) {
        const canvas = yield* addCanvas();
        const layout = openScene(canvas)?.layout.target;
        if (!Obj.instanceOf(Scene.Layout2D, layout)) {
          throw new Error('A scene canvas opens a 2D layout.');
        }
        Obj.update(layout, (layout) => {
          layout.lattice = { ...DEFAULT_LATTICE };
        });
        yield* Database.flush();
        const ref = Ref.make(canvas);
        const size = { width: DEFAULT_LATTICE.width, height: DEFAULT_LATTICE.height };
        const pitch = DEFAULT_LATTICE.width + DEFAULT_LATTICE.gutterX;

        yield* Operation.invoke(CanvasOperation.Apply, {
          canvas: ref,
          intents: [{ kind: 'create', element: { id: 'n', type: 'rect', z: 'a0', center: { x: 0, y: 0 }, size } }],
        });
        // A copy, since the stored centre is live and the move below rewrites it.
        const start = { x: layout.elements.n.center?.x ?? 0, y: layout.elements.n.center?.y ?? 0 };
        yield* Operation.invoke(CanvasOperation.Apply, {
          canvas: ref,
          intents: [{ kind: 'move', ids: ['n'], delta: { x: 370, y: 10 } }],
        });
        expect(layout.elements.n.center).toEqual({ x: start.x + pitch, y: start.y });

        // A second shape on the first cell: moving `n` back onto it would overlap, so the mode refuses it.
        yield* Operation.invoke(CanvasOperation.Apply, {
          canvas: ref,
          intents: [{ kind: 'create', element: { id: 'm', type: 'rect', z: 'a1', center: start, size } }],
        });
        const exit = yield* Operation.invoke(CanvasOperation.Apply, {
          canvas: ref,
          intents: [{ kind: 'move', ids: ['n'], delta: { x: -pitch, y: 0 } }],
        }).pipe(Effect.exit);
        expect(exit._tag).toBe('Failure');
        expect(layout.elements.n.center).toEqual({ x: start.x + pitch, y: start.y });
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    60_000,
  );

  it.effect(
    'apply moves a shape exactly on a scene canvas whose layout has no lattice',
    Effect.fnUntraced(
      function* ({ expect }) {
        const canvas = yield* addCanvas();
        yield* Database.flush();
        const layout = openScene(canvas)?.layout.target;
        if (!Obj.instanceOf(Scene.Layout2D, layout)) {
          throw new Error('A scene canvas opens a 2D layout.');
        }
        const ref = Ref.make(canvas);
        const size = { width: DEFAULT_LATTICE.width, height: DEFAULT_LATTICE.height };
        yield* Operation.invoke(CanvasOperation.Apply, {
          canvas: ref,
          intents: [{ kind: 'create', element: { id: 'n', type: 'rect', z: 'a0', center: { x: 0, y: 0 }, size } }],
        });
        yield* Operation.invoke(CanvasOperation.Apply, {
          canvas: ref,
          intents: [{ kind: 'move', ids: ['n'], delta: { x: 370, y: 10 } }],
        });
        expect(layout.elements.n.center).toEqual({ x: 370, y: 10 });
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    60_000,
  );
});

describe('scene revisions', () => {
  it('a later revision is newer, this one and earlier ones and other dialects are not', ({ expect }) => {
    expect(Canvas.sceneRevision('dxos.org/scene/2')).toBe(2);
    expect(Canvas.sceneRevision('tldraw.com/2')).toBeUndefined();
    expect(Canvas.isNewerScene(`dxos.org/scene/${Canvas.SCENE_REVISION + 1}`)).toBe(true);
    expect(Canvas.isNewerScene(Canvas.SCENE_SCHEMA)).toBe(false);
    expect(Canvas.isNewerScene(Canvas.SCENE_SCHEMA_V1)).toBe(false);
    expect(Canvas.isNewerScene(undefined)).toBe(false);
  });

  it.effect(
    'apply creates elements in the open layout from layout intents, and patch undoes them',
    Effect.fnUntraced(
      function* ({ expect }) {
        const canvas = yield* addCanvas();
        yield* Database.add(Drawing.make({ name: 'Scene', canvas }));
        yield* Database.flush();
        const layout = openScene(canvas)?.layout.target;
        if (!Obj.instanceOf(Scene.Layout2D, layout)) {
          throw new Error('A scene canvas opens a 2D layout.');
        }
        const element = { id: 'n', type: 'rect', z: 'a0', center: { x: 0, y: 0 }, size: { width: 64, height: 64 } };
        const ref = Ref.make(canvas);

        const created = yield* Operation.invoke(CanvasOperation.Apply, {
          canvas: ref,
          intents: [{ kind: 'create', element }],
        });
        expect(layout.elements.n).toMatchObject({ type: 'rect', center: { x: 0, y: 0 } });
        expect(created.paths).toEqual([[layout.key, 'elements', 'n']]);
        const moved = yield* Operation.invoke(CanvasOperation.Apply, {
          canvas: ref,
          intents: [{ kind: 'move', ids: ['n'], delta: { x: 10, y: 0 } }],
        });
        expect(moved.paths).toEqual([[layout.key, 'elements', 'n', 'center', 'x']]);
        expect(layout.elements.n.center?.x).toBe(10);
        yield* Database.flush();

        const undo = { canvas: ref, from: moved.after, to: moved.before, paths: moved.paths };
        expect(yield* Operation.invoke(CanvasOperation.Patch, undo)).toMatchObject({ written: 1, skipped: 0 });
        expect(layout.elements.n.center?.x).toBe(0);

        // A layout intent writes the layout's own mode, undone the same way.
        const lattice = { width: 256, height: 128, gutterX: 128, gutterY: 64 };
        const moded = yield* Operation.invoke(CanvasOperation.Apply, {
          canvas: ref,
          intents: [{ kind: 'layout', patch: { lattice } }],
        });
        expect(layout.lattice).toEqual(lattice);
        yield* Operation.invoke(CanvasOperation.Patch, {
          canvas: ref,
          from: moded.after,
          to: moded.before,
          paths: moded.paths,
        });
        expect(layout.lattice).toBeUndefined();
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    "apply refuses an intent not of the layout's dimension and writes nothing",
    Effect.fnUntraced(
      function* ({ expect }) {
        const canvas = yield* addCanvas();
        yield* Database.add(Drawing.make({ name: 'Scene', canvas }));
        yield* Database.flush();
        const layout = openScene(canvas)?.layout.target;
        if (!Obj.instanceOf(Scene.Layout2D, layout)) {
          throw new Error('A scene canvas opens a 2D layout.');
        }
        const element = { id: 'n', type: 'rect', z: 'a0', center: { x: 0, y: 0 }, size: { width: 64, height: 64 } };
        const exit = yield* Operation.invoke(CanvasOperation.Apply, {
          canvas: Ref.make(canvas),
          intents: [
            { kind: 'create', element },
            { kind: 'move', ids: ['n'], delta: { x: 1, y: 2, z: 3 } },
          ],
        }).pipe(Effect.exit);
        expect(exit._tag).toBe('Failure');
        expect(String(exit)).toContain('Intent 1 is not a valid layout intent.');
        expect(layout.elements.n).toBeUndefined();
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'apply edits a 3D canvas through its layout, as 2D',
    Effect.fnUntraced(
      function* ({ expect }) {
        const canvas = yield* addCanvas({ dimension: '3d' });
        yield* Database.flush();
        const layout = openScene(canvas)?.layout.target;
        if (!Obj.instanceOf(Scene.Layout3D, layout)) {
          throw new Error('A 3D canvas opens a 3D layout.');
        }
        const element = { id: 'cube', type: 'box', z: 'a0' };
        const created = yield* Operation.invoke(CanvasOperation.Apply, {
          canvas: Ref.make(canvas),
          intents: [{ kind: 'create', element }],
        });
        expect(layout.elements.cube).toMatchObject({ type: 'box' });
        expect(created.paths).toEqual([[layout.key, 'elements', 'cube']]);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
