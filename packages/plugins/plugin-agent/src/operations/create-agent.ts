//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Agent from '@dxos/assistant/Agent';
import * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import { Ref } from '@dxos/echo';

import { ConversationSkill, ModesSkill, RelaySkill } from '#skills';
import { AgentOperation, Mode } from '#types';

import { baseInstructions } from '../instructions.ts';
import { ensureModes } from './modes.ts';

const handler: Operation.WithHandler<typeof AgentOperation.CreateAgent> = AgentOperation.CreateAgent.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ name, instructions }) {
      // Bound by registry URI so the agent follows the compiled skills until `customizeSkill` forks one.
      // The base skills only: each further skill comes with a mode (see `switchMode`).
      const agent = yield* Agent.makeInitialized(
        {
          name,
          instructions: instructions ?? baseInstructions(name),
          skills: [Ref.fromURI(Skill.registryURI(ModesSkill.key)), Ref.fromURI(Skill.registryURI(RelaySkill.key))],
        },
        Ref.fromURI(Skill.registryURI(ConversationSkill.key)),
      );
      yield* ensureModes(agent);
      const chat = yield* Agent.loadChat(agent);
      if (chat) {
        Mode.setCurrent(chat, Mode.DEFAULT);
      }
      return { agent: Ref.make(agent) };
    }),
  ),
);

export default handler;
