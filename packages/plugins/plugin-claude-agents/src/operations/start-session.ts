//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Credential from '@dxos/compute/Credential';
import * as Operation from '@dxos/compute/Operation';
import { Database, Ref } from '@dxos/echo';

import { createSession } from '#api';
import { ClaudeAgentOperation, ClaudeAgentSession } from '#types';

import { ANTHROPIC_SOURCE } from '../constants';
import { AgentNotDeployedError, EnvironmentNotConfiguredError } from '../errors';

const handler: Operation.WithHandler<typeof ClaudeAgentOperation.StartSession> = ClaudeAgentOperation.StartSession.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ agent, message, title, environmentId }) {
      const agentObj = yield* Database.load(agent);
      if (!agentObj.agentId) {
        return yield* Effect.fail(new AgentNotDeployedError());
      }

      const environment = environmentId ?? agentObj.environmentId;
      if (!environment) {
        return yield* Effect.fail(new EnvironmentNotConfiguredError());
      }

      const apiKey = yield* Credential.getApiKeyValue({ service: ANTHROPIC_SOURCE });
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

      return { id: session.id, sessionId: response.id };
    }),
  ),
);

export default handler;
