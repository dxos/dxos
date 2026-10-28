//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj, Ref } from '@dxos/echo';

import { detach } from '#model';
import { AnimatorOperation } from '#types';

import { loadShot } from './load.ts';

const handler: Operation.WithHandler<typeof AnimatorOperation.PlaceEffect> = AnimatorOperation.PlaceEffect.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ animation: ref, shot: shotId, effect: effectRef, params, seed }) {
      const { animation, index, stage } = yield* loadShot(ref, shotId);
      const effect = yield* Database.load(effectRef);
      if (!stage) {
        return yield* Effect.fail(new AnimatorOperation.RendererError({ message: 'No stage renders the shot.' }));
      }
      if (!stage.renderers.includes(effect.renderer)) {
        return yield* Effect.fail(
          new AnimatorOperation.RendererError({
            message: `The ${stage.label} stage draws ${stage.renderers.join(', ')} effects, not ${effect.renderer}.`,
          }),
        );
      }
      const instance = Obj.ID.random();
      Obj.update(animation, (animation) => {
        animation.shots[index].effects.push({
          id: instance,
          effect: Ref.make(effect),
          params: detach(params),
          ...(seed !== undefined ? { seed } : {}),
        });
      });
      return { animation: ref, instance };
    }),
  ),
);

export default handler;
