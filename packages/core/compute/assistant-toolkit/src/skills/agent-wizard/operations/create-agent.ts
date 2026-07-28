//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation, Skill } from '@dxos/compute';
import { Obj, Ref } from '@dxos/echo';

import { AgentChat } from '../../../types';
import { AgentSkill } from '../../agent';
import { CreateAgent, SyncAutomation } from './definitions';

export default CreateAgent.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ name, instructions, skills, subscriptions }) {
      const agent = yield* AgentChat.makeInitialized(
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
