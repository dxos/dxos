//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Agent from '@dxos/assistant/Agent';
import * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import { Ref } from '@dxos/echo';

import { ConversationSkill, InterviewSkill } from '#skills';
import { AgentOperation } from '#types';

const handler: Operation.WithHandler<typeof AgentOperation.CreateAgent> = AgentOperation.CreateAgent.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ name, instructions }) {
      // Bound by registry URI so the agent follows the compiled skills until `customizeSkill` forks one.
      const agent = yield* Agent.makeInitialized(
        { name, instructions: instructions ?? '', skills: [Ref.fromURI(Skill.registryURI(InterviewSkill.key))] },
        Ref.fromURI(Skill.registryURI(ConversationSkill.key)),
      );
      return { agent: Ref.make(agent) };
    }),
  ),
);

export default handler;
