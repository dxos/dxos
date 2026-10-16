//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Obj } from '@dxos/echo';
import { createTimeline, setKey, trackId } from '@dxos/react-ui-canvas/scene';

import { putTimeline } from '#model';
import { CanvasOperation } from '#types';

import { CanvasElementNotFoundError, loadScene } from './canvas.ts';

const handler: Operation.WithHandler<typeof CanvasOperation.SetTimelineKey> = CanvasOperation.SetTimelineKey.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ drawing, scene, target, property, t, value, easing, duration }) {
      const { canvas, id: sceneId, scenes } = yield* loadScene(drawing, scene);
      const current = scenes[sceneId];
      if (!current) {
        return yield* Effect.fail(new CanvasElementNotFoundError({ message: `The drawing has no scene ${sceneId}.` }));
      }
      if (target !== 'camera' && !current.nodes[target]) {
        return yield* Effect.fail(new CanvasElementNotFoundError({ message: `The scene has no node ${target}.` }));
      }
      const before = current.timeline ?? createTimeline(Math.max(duration ?? 0, t));
      const keyed = setKey(before, target, property, { t, value, ...(easing !== undefined ? { easing } : {}) });
      // The timeline reaches at least as far as its last key.
      const timeline = { ...keyed, duration: Math.max(duration ?? keyed.duration, t) };
      Obj.update(canvas, (canvas) => putTimeline(canvas.content, sceneId, timeline));
      return { keys: timeline.tracks[trackId(target, property)]?.keys.length ?? 0 };
    }),
  ),
);

export default handler;
