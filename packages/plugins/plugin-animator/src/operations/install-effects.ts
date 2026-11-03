//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Filter, Ref } from '@dxos/echo';

import { BUILTIN_EFFECTS } from '#effects';
import { Animation, AnimatorOperation } from '#types';

const handler: Operation.WithHandler<typeof AnimatorOperation.InstallEffects> = AnimatorOperation.InstallEffects.pipe(
  Operation.withHandler(
    Effect.fn(function* () {
      const existing = yield* Database.query(Filter.type(Animation.Effect)).run;
      const byName = new Map(existing.map((effect) => [effect.name, effect]));
      const effects: Ref.Ref<Animation.Effect>[] = [];
      for (const builtin of BUILTIN_EFFECTS) {
        const effect = byName.get(builtin.name) ?? (yield* Database.add(Animation.makeEffect(builtin)));
        effects.push(Ref.make(effect));
      }
      return { effects };
    }),
  ),
);

export default handler;
