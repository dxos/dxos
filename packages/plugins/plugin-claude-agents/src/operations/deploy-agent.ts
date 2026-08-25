//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj } from '@dxos/echo';

import { createAgent, toAgentConfig, updateAgent } from '#api';
import { ClaudeAgentOperation } from '#types';

import { getApiKey } from '../credentials';

const handler: Operation.WithHandler<typeof ClaudeAgentOperation.DeployAgent> = ClaudeAgentOperation.DeployAgent.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ agent }) {
      const agentObj = yield* Database.load(agent);
      const apiKey = yield* getApiKey;
      const config = toAgentConfig(agentObj);

      const response = agentObj.agentId
        ? yield* updateAgent(apiKey, agentObj.agentId, config, agentObj.agentVersion)
        : yield* createAgent(apiKey, config);

      Obj.update(agentObj, (agentObj) => {
        agentObj.agentId = response.id;
        agentObj.agentVersion = response.version;
        agentObj.status = 'deployed';
      });

      return { agentId: response.id, version: response.version };
    }),
  ),
);

export default handler;
