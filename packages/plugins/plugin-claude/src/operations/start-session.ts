//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj, Ref } from '@dxos/echo';

import { createEnvironment, createSession, createVault, createVaultCredential } from '#api';
import { ClaudeAgentOperation, ClaudeAgentSession, ClaudeManagedAgent } from '#types';

import { DEFAULT_ENVIRONMENT_NAME, SESSION_VAULT_PREFIX } from '../constants';
import { getApiKey, toVaultCredentials } from '../credentials';
import { AgentNotDeployedError } from '../errors';

const handler: Operation.WithHandler<typeof ClaudeAgentOperation.StartSession> = ClaudeAgentOperation.StartSession.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ agent, message, title, environmentId, credentials }) {
      const agentObj = yield* Database.load(agent);
      const agentId = ClaudeManagedAgent.getAgentId(agentObj);
      if (!agentId) {
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

      // Created for every session, credentials or not: `vault_ids` is fixed at session creation, so
      // a session started without a vault could never be given a credential mid-run. Vault names are
      // not unique server-side, so the run's own id is appended to tell one session's vault from the
      // next in the Anthropic console.
      // Resolved first: a secret that fails to resolve after the vault exists leaves it orphaned.
      const bound = yield* toVaultCredentials(credentials ?? []);
      const vault = yield* createVault(
        apiKey,
        `${SESSION_VAULT_PREFIX}-${agentObj.name}-${crypto.randomUUID().slice(0, 8)}`,
      );
      yield* Effect.forEach(bound, (credential) => createVaultCredential(apiKey, vault.id, credential), {
        discard: true,
      });

      const response = yield* createSession(apiKey, {
        agentId,
        environmentId: environment,
        title: sessionTitle,
        message,
        vaultIds: [vault.id],
      });

      const session = yield* Database.add(
        ClaudeAgentSession.make({
          title: sessionTitle,
          agent: Ref.make(agentObj),
          sessionId: response.id,
          environmentId: environment,
          vaultId: vault.id,
          status: response.status,
          // Recorded so a later refresh can re-read these refs: the vault holds only the value, and
          // an OAuth token that rotates in the space leaves that copy stale.
          credentials: [...(credentials ?? [])],
        }),
      );

      return {
        id: session.id,
        sessionId: response.id,
        environmentId: environment,
        provisionedEnvironment: provisioned,
        boundCredentials: bound.map((credential) => credential.auth.secret_name),
      };
    }),
  ),
);

export default handler;
