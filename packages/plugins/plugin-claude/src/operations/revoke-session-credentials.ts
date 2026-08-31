//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database } from '@dxos/echo';

import { archiveVaultCredential, listVaultCredentials } from '#api';
import { ClaudeAgentOperation, ClaudeAgentSession } from '#types';

import { getApiKey } from '../credentials';
import { CredentialNotBoundError, SessionNotLinkedError, SessionVaultMissingError } from '../errors';

const handler: Operation.WithHandler<typeof ClaudeAgentOperation.RevokeSessionCredentials> =
  ClaudeAgentOperation.RevokeSessionCredentials.pipe(
    Operation.withHandler(
      Effect.fn(function* ({ session, names }) {
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
        const existing = yield* listVaultCredentials(apiKey, vaultId);
        const byName = new Map(
          existing.flatMap((credential) =>
            credential.auth?.secret_name ? [[credential.auth.secret_name, credential.id] as const] : [],
          ),
        );

        // Reported rather than ignored: silently succeeding would read as "the secret is gone" when
        // it is still bound under a different name.
        const missing = names.filter((name) => !byName.has(name));
        if (missing.length > 0) {
          return yield* Effect.fail(new CredentialNotBoundError({ context: { names: missing } }));
        }

        const targets = names.flatMap((name) => {
          const credentialId = byName.get(name);
          return credentialId ? [credentialId] : [];
        });

        // Archived rather than deleted: it purges the secret and frees the name for a replacement.
        yield* Effect.forEach(targets, (credentialId) => archiveVaultCredential(apiKey, vaultId, credentialId), {
          discard: true,
        });

        return { sessionId, revoked: [...names] };
      }),
    ),
  );

export default handler;
