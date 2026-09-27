//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Result from 'effect/Result';

import { Harness } from '@dxos/assistant';
import * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import { Database, Filter, Ref } from '@dxos/echo';

import { EnableSkills } from './definitions.ts';

export default EnableSkills.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ keys }) {
      const enabled: Skill.Skill[] = [];
      const rejected: { key: string; reason: string }[] = [];

      for (const key of keys) {
        // A space-authored skill has no registry entry, so the space is searched first.
        const [local] = yield* Database.query(Filter.and(Filter.type(Skill.Skill), Filter.key(key))).run;
        const result = local
          ? Result.succeed(local)
          : yield* Skill.resolve(key).pipe(
              Effect.mapError(() => ({ key, reason: 'Skill not found in this space or the registry.' })),
              Effect.result,
            );
        if (Result.isFailure(result)) {
          rejected.push(result.failure);
          continue;
        }
        if (!result.success.agentCanEnable) {
          rejected.push({ key, reason: 'Skill does not allow agent auto-enable (agentCanEnable is not set).' });
          continue;
        }
        const dbSkill = yield* Skill.upsert(key).pipe(Effect.orDie);
        enabled.push(dbSkill);
      }

      if (enabled.length > 0) {
        yield* Harness.bindContext({
          skills: enabled.map(Ref.make),
        });
      }

      return { enabled, rejected };
    }),
  ),
);
