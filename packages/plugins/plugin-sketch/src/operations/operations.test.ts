//
// Copyright 2026 DXOS.org
//

import { it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import { describe } from 'vitest';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import { Operation } from '@dxos/compute';
import { Database, Ref } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { EntityId } from '@dxos/keys';

import { Sketch, SketchOperation } from '../types';
import { SketchOperationHandlerSet } from './index';

EntityId.dangerouslyDisableRandomness();

const TestLayer = AssistantTestLayer({
  operationHandlers: SketchOperationHandlerSet,
  types: [Sketch.Sketch, Sketch.Canvas],
  disableLlmMemoization: true,
});

/**
 * Deterministic version of the storybook mental-model loop: draw a face, read the scene back,
 * add a hat and edit the smile by id, and confirm the untouched face elements survive.
 */
describe('sketch operations', () => {
  it.effect(
    'create → edit → read round-trip preserves untouched objects',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { object: sketch } = yield* Operation.invoke(SketchOperation.Create, { name: 'Portrait' });
        yield* Database.add(sketch);
        yield* Database.flush();
        const ref = Ref.make(sketch);

        // Draw a face.
        const face = yield* Operation.invoke(SketchOperation.Edit, {
          sketch: ref,
          commands: [
            {
              op: 'upsert-object',
              object: {
                id: 'face',
                origin: { x: 100, y: 100 },
                scale: 2,
                elements: [
                  { kind: 'circle', id: 'head', cx: 50, cy: 50, r: 50, color: 'yellow', fill: 'solid' },
                  { kind: 'circle', id: 'left-eye', cx: 30, cy: 35, r: 6, fill: 'solid' },
                  { kind: 'circle', id: 'right-eye', cx: 70, cy: 35, r: 6, fill: 'solid' },
                  { kind: 'arc', id: 'smile', cx: 50, cy: 55, r: 25, startAngle: 30, endAngle: 150 },
                ],
              },
            },
          ],
        });
        expect(face.upserted).toEqual(['face']);
        expect(face.scene.objects).toHaveLength(1);

        // Read the scene (what the agent would do before a follow-up edit).
        const read = yield* Operation.invoke(SketchOperation.Read, { sketch: ref });
        const readFace = read.scene.objects.find((object) => object.id === 'face');
        expect(readFace?.origin).toEqual({ x: 100, y: 100 });
        expect(readFace?.elements.map((element) => element.id)).toEqual(['head', 'left-eye', 'right-eye', 'smile']);

        // Add a hat above the face and turn the smile into a frown — by id, without resending the face.
        const edit = yield* Operation.invoke(SketchOperation.Edit, {
          sketch: ref,
          commands: [
            {
              op: 'upsert-object',
              object: {
                id: 'hat',
                origin: { x: 120, y: 40 },
                scale: 2,
                elements: [
                  { kind: 'rect', id: 'brim', x: 0, y: 25, w: 80, h: 6, color: 'blue', fill: 'solid' },
                  { kind: 'rect', id: 'crown', x: 20, y: 0, w: 40, h: 25, color: 'blue', fill: 'solid' },
                ],
              },
            },
            {
              op: 'upsert-elements',
              objectId: 'face',
              elements: [{ kind: 'arc', id: 'smile', cx: 50, cy: 70, r: 20, startAngle: 210, endAngle: 330 }],
            },
          ],
        });
        expect([...edit.upserted].sort()).toEqual(['face', 'hat']);
        expect(edit.scene.objects.map((object) => object.id).sort()).toEqual(['face', 'hat']);

        // The face's untouched elements survived the follow-up edit.
        const after = edit.scene.objects.find((object) => object.id === 'face');
        expect(after?.elements.find((element) => element.id === 'head')).toEqual(
          readFace?.elements.find((element) => element.id === 'head'),
        );

        // Remove the hat again.
        const removed = yield* Operation.invoke(SketchOperation.Edit, {
          sketch: ref,
          commands: [{ op: 'remove-object', objectId: 'hat' }],
        });
        expect(removed.scene.objects.map((object) => object.id)).toEqual(['face']);
        expect(removed.removed).toBe(2);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
