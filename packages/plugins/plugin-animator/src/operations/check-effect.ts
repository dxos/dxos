//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database } from '@dxos/echo';

import { bindingTrack, checkEffect, effectCompiler } from '#effects';
import { compileShot, sampleTimeline, stageContext } from '#model';
import { AnimatorOperation } from '#types';

import { loadShot } from './load.ts';

const handler: Operation.WithHandler<typeof AnimatorOperation.CheckEffect> = AnimatorOperation.CheckEffect.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ effect: ref, params, duration, animation, shot: shotId, seed }) {
      const effect = yield* Database.load(ref);
      let binding: ReturnType<typeof bindingTrack> | undefined;
      if (animation && shotId) {
        const { shot, object, stage } = yield* loadShot(animation, shotId);
        const bind = stage?.bind;
        if (stage && bind) {
          const compiled = compileShot(shot, stageContext(stage, object));
          binding = bindingTrack(duration, (t) => bind(object, sampleTimeline(compiled.timeline, t, shot.camera)));
        }
      }
      return yield* Effect.promise(() =>
        checkEffect({
          compile: effectCompiler,
          source: effect.source,
          renderer: effect.renderer,
          params,
          schema: effect.params,
          duration,
          ...(seed !== undefined ? { seed } : {}),
          ...(binding ? { binding } : {}),
        }),
      );
    }),
  ),
);

export default handler;
