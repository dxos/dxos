//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { setKey, trackId } from '@dxos/animation';
import * as Operation from '@dxos/compute/Operation';
import { Obj } from '@dxos/echo';

import { detach, keyError, keyKind, parseKeyPath } from '#model';
import { AnimatorOperation } from '#types';

import { loadShot } from './load.ts';

const handler: Operation.WithHandler<typeof AnimatorOperation.SetKey> = AnimatorOperation.SetKey.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ animation: ref, shot: shotId, t, path, value, ease }) {
      const { animation, index, shot, object, stage } = yield* loadShot(ref, shotId);
      const track = parseKeyPath(path);
      if (!track) {
        return yield* Effect.fail(new AnimatorOperation.UnknownTargetError({ message: `Not a key path: ${path}.` }));
      }
      const targets = stage?.targets(object);
      const error = keyError(track, shot, targets);
      if (error) {
        return yield* Effect.fail(new AnimatorOperation.UnknownTargetError({ message: error }));
      }
      const keyed = setKey(
        shot.timeline,
        track.target,
        track.property,
        { t, value, ...(ease !== undefined ? { easing: ease } : {}) },
        keyKind(track, targets),
      );
      // A key past the end lengthens the shot to reach it.
      const duration = Math.max(shot.duration, t);
      const timeline = detach({ ...keyed, duration: Math.max(keyed.duration, duration) });
      Obj.update(animation, (animation) => {
        animation.shots[index].timeline = timeline;
        animation.shots[index].duration = duration;
      });
      return { animation: ref, keys: timeline.tracks[trackId(track.target, track.property)]?.keys.length ?? 0 };
    }),
  ),
);

export default handler;
