//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database } from '@dxos/echo';

import { createVaultCredential, listVaultCredentials, updateVaultCredential } from '#api';
import { ClaudeAgentOperation, ClaudeAgentSession } from '#types';

import { getApiKey, toVaultCredentials } from '../credentials.ts';
import { SessionNotLinkedError, SessionVaultMissingError } from '../errors.ts';

const handler: Operation.WithHandler<typeof ClaudeAgentOperation.SetSessionCredentials> =
  ClaudeAgentOperation.SetSessionCredentials.pipe(
    Operation.withHandler(
      Effect.fn(function* ({ session, credentials }) {
        const sessionObj = yield* Database.load(session);
        const sessionId = ClaudeAgentSession.getSessionId(sessionObj);
        if (!sessionId) {
          return yield* Effect.fail(new SessionNotLinkedError());
        }
        const vaultId = sessionObj.vaultId;
        if (!vaultId) {
          return yield* Effect.fail(new SessionVaultMissingError());
        }

        const apiKey = yield* getApiKey;
        const resolved = yield* toVaultCredentials(credentials);

        // A name is unique within the vault, so rebinding one already present must rotate it.
        const existing = yield* listVaultCredentials(apiKey, vaultId);
        const byName = new Map(
          existing.flatMap((credential) =>
            credential.auth?.secret_name ? [[credential.auth.secret_name, credential.id] as const] : [],
          ),
        );

        yield* Effect.forEach(
          resolved,
          (credential) => {
            const credentialId = byName.get(credential.auth.secret_name);
            return credentialId
              ? updateVaultCredential(apiKey, vaultId, credentialId, credential)
              : createVaultCredential(apiKey, vaultId, credential);
          },
          { discard: true },
        );

        return { sessionId, bound: resolved.map((credential) => credential.auth.secret_name) };
      }),
    ),
  );

export default handler;
