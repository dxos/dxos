//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj, Ref } from '@dxos/echo';

import { createEnvironment, createSession } from '#api';
import { ClaudeAgentOperation, ClaudeAgentSession } from '#types';

import { DEFAULT_ENVIRONMENT_NAME } from '../constants';
import { getApiKey } from '../credentials';
import { AgentNotDeployedError } from '../errors';

const handler: Operation.WithHandler<typeof ClaudeAgentOperation.StartSession> = ClaudeAgentOperation.StartSession.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ agent, message, title, environmentId }) {
      const agentObj = yield* Database.load(agent);
      if (!agentObj.agentId) {
        return yield* Effect.fail(new AgentNotDeployedError());
      }

      const apiKey = yield* getApiKey;

      // Provisioned on demand so the first run does not require a Console visit.
      const configured = environmentId ?? agentObj.environmentId;
      const environment = configured ?? (yield* createEnvironment(apiKey, DEFAULT_ENVIRONMENT_NAME)).id;
      const provisioned = configured === undefined;
      if (provisioned) {
        Obj.update(agentObj, (agentObj) => {
          agentObj.environmentId = environment;
        });
      }

      const sessionTitle = title ?? `${agentObj.name} session`;
      const response = yield* createSession(apiKey, {
        agentId: agentObj.agentId,
        environmentId: environment,
        title: sessionTitle,
        message,
      });

      const session = yield* Database.add(
        ClaudeAgentSession.make({
          title: sessionTitle,
          agent: Ref.make(agentObj),
          sessionId: response.id,
          environmentId: environment,
          status: response.status,
        }),
      );

      return {
        id: session.id,
        sessionId: response.id,
        environmentId: environment,
        provisionedEnvironment: provisioned,
      };
    }),
  ),
);

export default handler;
