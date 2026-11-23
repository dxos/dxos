//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Ref } from '@dxos/echo';

import { effectCompiler } from '#effects';
import { Animation, AnimatorOperation } from '#types';

const handler: Operation.WithHandler<typeof AnimatorOperation.CreateEffect> = AnimatorOperation.CreateEffect.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ name, description, renderer, source, params }) {
      const effect = yield* Database.add(Animation.makeEffect({ name, description, renderer, source, params }));
      const compiled = yield* Effect.promise(() => effectCompiler(source));
      return {
        effect: Ref.make(effect),
        version: effect.version,
        ...(compiled.errors ? { errors: compiled.errors } : {}),
      };
    }),
  ),
);

export default handler;
