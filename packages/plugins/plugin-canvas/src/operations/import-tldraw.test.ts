//
// Copyright 2026 DXOS.org
//

import { it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import { describe, test } from 'vitest';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import * as Operation from '@dxos/compute/Operation';
import { Database, Ref } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import * as Tldraw from '@dxos/plugin-tldraw/Tldraw';

import { CanvasOperationHandlerSet } from '#operations';
import { Canvas, CanvasOperation } from '#types';

import { frameWithChildren } from '../import/testing.ts';
import { readViews, rootOf } from '../model/content.ts';

const TestLayer = AssistantTestLayer({
  operationHandlers: CanvasOperationHandlerSet.handlers,
  types: [Drawing.Drawing, Drawing.Canvas],
  disableLlmMemoization: true,
});

describe('ImportTldraw', () => {
  test('reads the dialect plugin-tldraw writes', ({ expect }) => {
    expect(Canvas.TLDRAW_SCHEMA).toBe(Tldraw.TLDRAW_SCHEMA);
  });

  it.effect(
    'creates a canvas drawing beside the tldraw one, which is left as it was',
    Effect.fnUntraced(
      function* ({ expect }) {
        const content = frameWithChildren();
        const sourceCanvas = yield* Database.add(Drawing.makeCanvas({ schema: Canvas.TLDRAW_SCHEMA, content }));
        const source = yield* Database.add(Drawing.make({ name: 'Sketch', canvas: sourceCanvas }));
        yield* Database.flush();

        const result = yield* Operation.invoke(CanvasOperation.ImportTldraw, { drawing: Ref.make(source) });
        expect(result).toMatchObject({ nodes: 4, links: 2, skipped: {}, approximated: {} });

        const drawing = yield* Database.load(result.drawing);
        expect(drawing.name).toBe('Sketch');
        const canvas = yield* Database.load(drawing.canvas);
        expect(canvas.schema).toBe(Canvas.SCENE_SCHEMA);
        const root = rootOf(canvas.content) ?? '';
        const views = readViews(canvas.content);
        expect(Object.keys(views[root].nodes).sort()).toEqual(['frame', 'outside']);
        expect(views['frame-view'].links['inner-arrow']).toMatchObject({
          source: { node: 'inner-a' },
          target: { node: 'inner-b' },
        });

        expect(Object.keys(sourceCanvas.content).sort()).toEqual(Object.keys(content).sort());
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    60_000,
  );

  it.effect(
    'fails on a drawing of another dialect',
    Effect.fnUntraced(
      function* ({ expect }) {
        const canvas = yield* Database.add(Drawing.makeCanvas({ schema: Canvas.SCENE_SCHEMA, content: {} }));
        const drawing = yield* Database.add(Drawing.make({ canvas }));
        yield* Database.flush();

        const exit = yield* Operation.invoke(CanvasOperation.ImportTldraw, { drawing: Ref.make(drawing) }).pipe(
          Effect.exit,
        );
        expect(Exit.isFailure(exit)).toBe(true);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    60_000,
  );
});
