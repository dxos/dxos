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
import { Scene, isGeneratorNode } from '@dxos/scene';

import { addCanvas, createCanvas, openScene, readViews, rootOf } from '#model';
import { CanvasOperationHandlerSet } from '#operations';
import { Canvas, CanvasOperation } from '#types';

import schemaTypes from '../capabilities/schema.ts';

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
    'create, place and check a generator',
    Effect.fnUntraced(
      function* ({ expect }) {
        const canvas = yield* Database.add(createCanvas());
        const drawing = yield* Database.add(Drawing.make({ name: 'Test', canvas }));
        yield* Database.flush();

        const created = yield* Operation.invoke(CanvasOperation.CreateGenerator, { name: 'Orbit', source: SOURCE });
        expect(created.errors).toBeUndefined();
        expect(created.version).toBe(1);

        const { node } = yield* Operation.invoke(CanvasOperation.AddGenerator, {
          drawing: Ref.make(drawing),
          generator: created.generator,
          bounds: { x: -100, y: -100, width: 200, height: 200 },
          params: { count: 3 },
        });
        const root = rootOf(canvas.content) ?? '';
        const scene = readViews(canvas.content)[root];
        expect(Object.values(scene.nodes).filter(isGeneratorNode)).toHaveLength(1);

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
    'apply edits a View and returns the patch that undoes it; the patch skips what changed since',
    Effect.fnUntraced(
      function* ({ expect }) {
        const canvas = yield* Database.add(createCanvas());
        yield* Database.add(Drawing.make({ name: 'Test', canvas }));
        yield* Database.flush();
        const root = rootOf(canvas.content) ?? '';
        const node = { id: 'n', type: 'rect', z: 'a0', center: { x: 0, y: 0 }, size: { width: 64, height: 64 } };
        const ref = Ref.make(canvas);
        const at = () => readViews(canvas.content)[root].nodes.n;

        const created = yield* Operation.invoke(CanvasOperation.Apply, {
          canvas: ref,
          intents: [{ kind: 'create', node }],
        });
        expect(created.canvas).toBe(canvas.id);
        expect(created.paths).toEqual([[root, 'nodes', 'n']]);
        const moved = yield* Operation.invoke(CanvasOperation.Apply, {
          canvas: ref,
          intents: [{ kind: 'move', ids: ['n'], delta: { x: 10, y: 0 } }],
        });
        expect(moved.paths).toEqual([[root, 'nodes', 'n', 'center', 'x']]);
        expect(at()?.center.x).toBe(10);

        // Undo the move, then redo it: the same patch read the other way.
        const undo = { canvas: ref, from: moved.after, to: moved.before, paths: moved.paths };
        expect(yield* Operation.invoke(CanvasOperation.Patch, undo)).toMatchObject({ written: 1, skipped: 0 });
        expect(at()?.center.x).toBe(0);
        yield* Operation.invoke(CanvasOperation.Patch, { ...undo, from: moved.before, to: moved.after });
        expect(at()?.center.x).toBe(10);

        // Someone moves the node again: undoing the first move would overwrite that, so it is skipped.
        yield* Operation.invoke(CanvasOperation.Apply, {
          canvas: ref,
          intents: [{ kind: 'move', ids: ['n'], delta: { x: 5, y: 0 } }],
        });
        expect(yield* Operation.invoke(CanvasOperation.Patch, undo)).toMatchObject({ written: 0, skipped: 1 });
        expect(at()?.center.x).toBe(15);

        // A create wrote the whole record, so once the node has moved since, undoing the create leaves it.
        yield* Operation.invoke(CanvasOperation.Patch, {
          canvas: ref,
          from: created.after,
          to: created.before,
          paths: created.paths,
        });
        expect(at()?.center.x).toBe(15);
        expect(yield* Operation.invoke(CanvasOperation.Apply, { canvas: ref, intents: [] })).toMatchObject({
          paths: [],
        });
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    60_000,
  );

  it.effect(
    'apply refuses a malformed intent and writes nothing',
    Effect.fnUntraced(
      function* ({ expect }) {
        const canvas = yield* Database.add(createCanvas());
        yield* Database.add(Drawing.make({ name: 'Test', canvas }));
        yield* Database.flush();
        const root = rootOf(canvas.content) ?? '';
        const node = { id: 'n', type: 'rect', z: 'a0', center: { x: 0, y: 0 }, size: { width: 64, height: 64 } };
        const exit = yield* Operation.invoke(CanvasOperation.Apply, {
          canvas: Ref.make(canvas),
          intents: [
            { kind: 'create', node },
            { kind: 'move', ids: ['n'] },
          ],
        }).pipe(Effect.exit);
        expect(exit._tag).toBe('Failure');
        expect(String(exit)).toContain('Intent 1 is not a valid canvas intent.');
        expect(readViews(canvas.content)[root].nodes.n).toBeUndefined();

        yield* Operation.invoke(CanvasOperation.Apply, {
          canvas: Ref.make(canvas),
          intents: [{ kind: 'create', node }],
        });
        const update = yield* Operation.invoke(CanvasOperation.Apply, {
          canvas: Ref.make(canvas),
          intents: [{ kind: 'update', id: 'n', values: { center: 'abc' } }],
        }).pipe(Effect.exit);
        expect(update._tag).toBe('Failure');
        expect(readViews(canvas.content)[root].nodes.n?.center).toEqual({ x: 0, y: 0 });
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    60_000,
  );

  it.effect(
    'apply refuses a canvas a newer plugin wrote and writes nothing',
    Effect.fnUntraced(
      function* ({ expect }) {
        const canvas = yield* Database.add(createCanvas());
        yield* Database.add(Drawing.make({ name: 'Test', canvas }));
        Obj.update(canvas, (canvas) => {
          canvas.schema = `dxos.org/scene/${Canvas.SCENE_REVISION + 1}`;
        });
        yield* Database.flush();
        const root = rootOf(canvas.content) ?? '';
        const node = { id: 'n', type: 'rect', z: 'a0', center: { x: 0, y: 0 }, size: { width: 64, height: 64 } };
        const exit = yield* Operation.invoke(CanvasOperation.Apply, {
          canvas: Ref.make(canvas),
          intents: [{ kind: 'create', node }],
        }).pipe(Effect.exit);
        expect(exit._tag).toBe('Failure');
        expect(String(exit)).toContain('update the Canvas plugin');
        expect(readViews(canvas.content)[root].nodes.n).toBeUndefined();
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
