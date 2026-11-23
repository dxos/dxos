//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj } from '@dxos/echo';
import { fromRenderList2D } from '@dxos/react-ui-canvas/headless';
import { topZ } from '@dxos/react-ui-canvas/headless';
import { type GeneratorNode, Scene } from '@dxos/scene';

import { CanvasOperation, Generator } from '#types';

import { openScene } from '../model/canvas-document.ts';
import { applyLayoutIntent, canvasLayouts } from '../model/layout-source.ts';
import { CanvasElementNotFoundError, drawingCanvasOf } from './canvas.ts';

const handler: Operation.WithHandler<typeof CanvasOperation.AddGenerator> = CanvasOperation.AddGenerator.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ drawing: drawingRef, generator: ref, scene, bounds, params, seed, layer }) {
      const generator = yield* Database.load(ref);
      const node = (z: string): GeneratorNode => ({
        type: 'generator',
        id: `generator-${crypto.randomUUID().slice(0, 8)}`,
        z,
        center: { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 },
        size: { width: bounds.width, height: bounds.height },
        generator: Generator.referenceOf(generator),
        params: params ?? {},
        ...(seed !== undefined ? { seed } : {}),
        ...(layer !== undefined ? { layer } : {}),
      });

      const canvas = yield* drawingCanvasOf(yield* Database.load(drawingRef));
      const layout = scene === undefined ? openScene(canvas)?.layout.target : canvasLayouts(canvas).get(scene);
      if (!Obj.instanceOf(Scene.Layout2D, layout)) {
        return yield* Effect.fail(
          new CanvasElementNotFoundError({ message: `Canvas ${canvas.id} has no 2D layout ${scene ?? 'open'}.` }),
        );
      }
      const placed = node(
        topZ(Object.values(layout.elements).flatMap(({ id, z }) => (z === undefined ? [] : [{ id, z }]))),
      );
      // The node's element as the engine writes one, so the canvas reads it back as the same generator node.
      const element = fromRenderList2D({ id: layout.key, nodes: { [placed.id]: placed }, links: {} }).layout.elements[
        placed.id
      ];
      applyLayoutIntent(layout, { kind: 'create', element });
      return { node: placed.id };
    }),
  ),
);

export default handler;
