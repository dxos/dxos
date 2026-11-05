//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Ref } from '@dxos/echo';

import { Animation, AnimatorOperation } from '#types';

const handler: Operation.WithHandler<typeof AnimatorOperation.CreateAnimation> = AnimatorOperation.CreateAnimation.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ name, stages, fps }) {
      const animation = yield* Database.add(Animation.make({ name, fps, stages }));
      return { animation: Ref.make(animation) };
    }),
  ),
);

export default handler;
