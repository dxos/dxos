//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import { Obj, Ref } from '@dxos/echo';

import { Agent } from '../../../types';
import { AgentSkill } from '../../agent';
import { CreateAgent, SyncAutomation } from './definitions';

export default CreateAgent.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ name, instructions, skills, subscriptions }) {
      const agent = yield* Agent.makeInitialized(
        {
          name,
          instructions,
          skills: yield* Effect.forEach(skills, (key) => Skill.upsert(key).pipe(Effect.map(Ref.make), Effect.orDie)),
        },
        Obj.clone(AgentSkill.make()),
      );
      // Subscriptions compile straight to Routines (the agent stores no automation fields).
      yield* Operation.invoke(SyncAutomation, { agent: Ref.make(agent), subscriptions });
      return agent;
    }),
  ),
);
