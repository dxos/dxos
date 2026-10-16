//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj } from '@dxos/echo';
import { type GeneratorNode, topZ } from '@dxos/react-ui-canvas/scene';

import { putNodeRecord } from '#model';
import { CanvasOperation, Generator } from '#types';

import { loadScene } from './canvas.ts';

const handler: Operation.WithHandler<typeof CanvasOperation.AddGenerator> = CanvasOperation.AddGenerator.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ drawing, generator: ref, scene, bounds, params, seed, layer }) {
      const generator = yield* Database.load(ref);
      const { canvas, id: sceneId, scenes } = yield* loadScene(drawing, scene);
      const node: GeneratorNode = {
        type: 'generator',
        id: `generator-${crypto.randomUUID().slice(0, 8)}`,
        z: topZ(Object.values(scenes[sceneId]?.nodes ?? {})),
        center: { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 },
        size: { width: bounds.width, height: bounds.height },
        generator: Generator.referenceOf(generator),
        params: params ?? {},
        ...(seed !== undefined ? { seed } : {}),
        ...(layer !== undefined ? { layer } : {}),
      };
      Obj.update(canvas, (canvas) => putNodeRecord(canvas.content, sceneId, node));
      return { node: node.id };
    }),
  ),
);

export default handler;
