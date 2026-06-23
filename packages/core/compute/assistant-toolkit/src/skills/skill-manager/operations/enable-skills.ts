//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Either from 'effect/Either';

import { AiContext } from '@dxos/assistant';
import { Skill, Operation } from '@dxos/compute';
import { Ref } from '@dxos/echo';

import { EnableSkills } from './definitions';

export default EnableSkills.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ keys }) {
      const enabled: Skill.Skill[] = [];
      const rejected: { key: string; reason: string }[] = [];

      for (const key of keys) {
        const result = yield* Skill.resolve(key).pipe(
          Effect.mapError(() => ({ key, reason: 'Skill not found in registry.' })),
          Effect.either,
        );
        if (Either.isLeft(result)) {
          rejected.push(result.left);
          continue;
        }
        if (!result.right.agentCanEnable) {
          rejected.push({ key, reason: 'Skill does not allow agent auto-enable (agentCanEnable is not set).' });
          continue;
        }
        const dbSkill = yield* Skill.upsert(key).pipe(Effect.orDie);
        enabled.push(dbSkill);
      }

      if (enabled.length > 0) {
        yield* AiContext.Service.bindContext({
          skills: enabled.map(Ref.make),
        });
      }

      return { enabled, rejected };
    }),
  ),
);
