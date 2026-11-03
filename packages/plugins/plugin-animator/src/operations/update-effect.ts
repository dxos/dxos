//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj } from '@dxos/echo';

import { effectCompiler } from '#effects';
import { detach } from '#model';
import { AnimatorOperation } from '#types';

const handler: Operation.WithHandler<typeof AnimatorOperation.UpdateEffect> = AnimatorOperation.UpdateEffect.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ effect: ref, source, params, description }) {
      const effect = yield* Database.load(ref);
      Obj.update(effect, (effect) => {
        if (source !== undefined) {
          effect.source = source;
        }
        if (params !== undefined) {
          effect.params = detach(params);
        }
        if (description !== undefined) {
          effect.description = description;
        }
        // A new version is a new module key, so every runner of the old revision starts over.
        effect.version += 1;
      });
      const compiled = yield* Effect.promise(() => effectCompiler(effect.source));
      return { effect: ref, version: effect.version, ...(compiled.errors ? { errors: compiled.errors } : {}) };
    }),
  ),
);

export default handler;
