//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Agent from '@dxos/assistant/Agent';
import * as Operation from '@dxos/compute/Operation';
import { Database, Obj, Ref } from '@dxos/echo';

import { AgentOperation } from '#types';

import { openBinder } from './agent-skills.ts';

const handler: Operation.WithHandler<typeof AgentOperation.ListSkills> = AgentOperation.ListSkills.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ agent: agentRef }) {
      const agent = yield* Database.load(agentRef).pipe(Effect.orDie);
      const chat = yield* Agent.loadChat(agent);
      if (!chat) {
        return { skills: [] };
      }

      const binder = yield* openBinder(chat);
      return {
        skills: binder.getSkills().map((skill) => {
          // A skill resolved from the registry has no database; one in the space is an editable copy.
          const customized = Obj.getDatabase(skill) !== undefined;
          return {
            key: Obj.getMeta(skill).key,
            name: skill.name,
            customized,
            skill: customized ? Ref.make(skill) : undefined,
          };
        }),
      };
    }, Effect.scoped),
  ),
);

export default handler;
