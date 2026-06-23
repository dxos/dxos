//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Either from 'effect/Either';

import { Harness } from '@dxos/assistant';
import { Blueprint, Operation } from '@dxos/compute';
import { Ref } from '@dxos/echo';

import { EnableBlueprints } from './definitions';

export default EnableBlueprints.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ keys }) {
      const enabled: Blueprint.Blueprint[] = [];
      const rejected: { key: string; reason: string }[] = [];

      for (const key of keys) {
        const result = yield* Blueprint.resolve(key).pipe(
          Effect.mapError(() => ({ key, reason: 'Blueprint not found in registry.' })),
          Effect.either,
        );
        if (Either.isLeft(result)) {
          rejected.push(result.left);
          continue;
        }
        if (!result.right.agentCanEnable) {
          rejected.push({ key, reason: 'Blueprint does not allow agent auto-enable (agentCanEnable is not set).' });
          continue;
        }
        const dbBlueprint = yield* Blueprint.upsert(key).pipe(Effect.orDie);
        enabled.push(dbBlueprint);
      }

      if (enabled.length > 0) {
        const binder = yield* Harness.binder;
        yield* Effect.promise(() => binder.bind({ blueprints: enabled.map(Ref.make) }));
      }

      return { enabled, rejected };
    }),
  ),
);
