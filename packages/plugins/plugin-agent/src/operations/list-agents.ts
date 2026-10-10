//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Agent from '@dxos/assistant/Agent';
import * as Chat from '@dxos/assistant/Chat';
import * as Operation from '@dxos/compute/Operation';
import { Database, Filter, Obj, Ref } from '@dxos/echo';

import { AgentOperation } from '#types';

const handler: Operation.WithHandler<typeof AgentOperation.ListAgents> = AgentOperation.ListAgents.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* () {
      const agents = yield* Database.query(Filter.type(Agent.Agent)).run;
      const chats = yield* Database.query(Filter.type(Chat.Chat)).run;
      return {
        agents: agents.map((agent) => ({
          agent: Ref.make(agent),
          name: agent.name,
          chats: chats.filter((chat) => Obj.getParent(chat)?.id === agent.id).length,
        })),
      };
    }, Effect.orDie),
  ),
);

export default handler;
