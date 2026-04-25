//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Blueprint } from '@dxos/compute';
import { Obj, Ref } from '@dxos/echo';
import { Operation } from '@dxos/compute';

import { Agent } from '../../../types';
import { AgentBlueprint } from '../../project';
import { CreateAgent, SyncTriggers } from './definitions';

export default CreateAgent.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ name, instructions, blueprints, subscriptions }) {
      const agent = yield* Agent.makeInitialized(
        {
          name,
          instructions,
          blueprints: yield* Effect.forEach(blueprints, (key) =>
            Blueprint.upsert(key).pipe(Effect.map(Ref.make), Effect.orDie),
          ),
          subscriptions,
        },
        Obj.clone(AgentBlueprint.make()),
      );
      yield* Operation.invoke(SyncTriggers, { agent: Ref.make(agent) });
      return agent;
    }),
  ),
);
