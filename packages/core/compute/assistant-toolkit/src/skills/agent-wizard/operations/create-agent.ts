//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Skill, Operation } from '@dxos/compute';
import { Obj, Ref } from '@dxos/echo';

import { Agent } from '../../../types';
import { AgentSkill } from '../../agent';
import { CreateAgent, SyncTriggers } from './definitions';

export default CreateAgent.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ name, instructions, skills, subscriptions }) {
      const agent = yield* Agent.makeInitialized(
        {
          name,
          instructions,
          skills: yield* Effect.forEach(skills, (key) =>
            Skill.upsert(key).pipe(Effect.map(Ref.make), Effect.orDie),
          ),
          subscriptions,
        },
        Obj.clone(AgentSkill.make()),
      );
      yield* Operation.invoke(SyncTriggers, { agent: Ref.make(agent) });
      return agent;
    }),
  ),
);
