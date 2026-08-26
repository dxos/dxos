//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database } from '@dxos/echo';

import { createVaultCredential, listVaultCredentials, updateVaultCredential } from '#api';
import { ClaudeAgentOperation, ClaudeAgentSession } from '#types';

import { getApiKey, toVaultCredentials } from '../credentials';
import { SessionNotLinkedError, SessionVaultMissingError } from '../errors';

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

        // A credential's name is immutable and unique within the vault, so a rebind of a name already
        // present has to rotate the stored secret rather than create a second entry (which is a 409).
        const existing = yield* listVaultCredentials(apiKey, vaultId);
        const byName = new Map(
          (existing.data ?? []).flatMap((credential) =>
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
