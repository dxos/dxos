//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Filter, Query } from '@dxos/echo';

import { ClaudeAgentOperation, ClaudeManagedAgent } from '#types';

const handler: Operation.WithHandler<typeof ClaudeAgentOperation.ListAgents> = ClaudeAgentOperation.ListAgents.pipe(
  Operation.withHandler(
    Effect.fn(function* () {
      const agents = yield* Database.query(Query.select(Filter.type(ClaudeManagedAgent.ClaudeManagedAgent))).run;

      return {
        agents: agents.map((agent) => ({
          id: agent.id,
          name: agent.name,
          model: agent.model,
          status: agent.status,
          agentId: ClaudeManagedAgent.getAgentId(agent),
          environmentId: agent.environmentId,
        })),
      };
    }),
  ),
);

export default handler;
