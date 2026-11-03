//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import { Database, type Ref } from '@dxos/echo';

import { type Animation, AnimatorCapabilities, AnimatorOperation } from '#types';

/** An animation, the index of one of its shots, and the stage that renders that shot (when one is contributed). */
export const loadShot = Effect.fn(function* (ref: Ref.Ref<Animation.Animation>, shotId: string) {
  const animation = yield* Database.load(ref);
  const index = animation.shots.findIndex((shot) => shot.id === shotId);
  if (index < 0) {
    return yield* Effect.fail(
      new AnimatorOperation.UnknownShotError({ message: `The animation has no shot ${shotId}.` }),
    );
  }
  const shot = animation.shots[index];
  const object = yield* Database.load(shot.stage);
  const stages = yield* Capability.getAll(AnimatorCapabilities.Stage);
  const stage = AnimatorCapabilities.findStage(stages, object);
  return { animation, index, shot, object, stage };
});
