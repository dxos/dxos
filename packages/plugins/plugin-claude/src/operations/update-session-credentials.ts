//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj } from '@dxos/echo';

import { archiveVaultCredential, createVaultCredential, listVaultCredentials, updateVaultCredential } from '#api';
import { ClaudeAgentOperation, ClaudeAgentSession } from '#types';

import { getApiKey, toVaultCredentials } from '../credentials';
import {
  CredentialConflictError,
  CredentialNotBoundError,
  NoCredentialChangeError,
  SessionNotLinkedError,
  SessionVaultMissingError,
} from '../errors';

const handler: Operation.WithHandler<typeof ClaudeAgentOperation.UpdateSessionCredentials> =
  ClaudeAgentOperation.UpdateSessionCredentials.pipe(
    Operation.withHandler(
      Effect.fn(function* ({ session, credentials = [], revoke = [], refresh = false }) {
        // Rejected rather than treated as a no-op: an empty call would report success having changed
        // nothing, which reads as "the credential is current" when it was never touched.
        if (credentials.length === 0 && revoke.length === 0 && !refresh) {
          return yield* Effect.fail(new NoCredentialChangeError());
        }

        // Rejected before any write: binding and revoking one name in the same call would write the
        // credential and then archive it, leaving the session's record reporting it bound.
        const conflicting = credentials.filter(({ as }) => revoke.includes(as)).map(({ as }) => as);
        if (conflicting.length > 0) {
          return yield* Effect.fail(new CredentialConflictError({ context: { names: conflicting } }));
        }

        const sessionObj = yield* Database.load(session);
        const sessionId = ClaudeAgentSession.getSessionId(sessionObj);
        if (!sessionId) {
          return yield* Effect.fail(new SessionNotLinkedError());
        }
        const vaultId = sessionObj.vaultId;
        if (!vaultId) {
          return yield* Effect.fail(new SessionVaultMissingError());
        }

        const recorded = sessionObj.credentials ?? [];
        if (refresh && recorded.length === 0) {
          // A session bound before its refs were recorded has nothing to re-read; naming the
          // credentials explicitly is the way to bind it, so say that rather than reporting nothing.
          return yield* Effect.fail(new CredentialNotBoundError());
        }

        const apiKey = yield* getApiKey;
        // A name revoked in the same call is dropped from the refresh set: an explicit revoke is the
        // more specific instruction, and writing the value back would only archive it again.
        const refreshed = refresh ? recorded.filter(({ as }) => !revoke.includes(as)) : [];
        // Resolved before anything is written: a secret that fails to resolve halfway through would
        // leave the vault holding some of the request. Refreshed refs come first so an explicit entry
        // for the same variable wins — `toVaultCredentials` keeps the last of a repeated name.
        const resolved = yield* toVaultCredentials([...refreshed, ...credentials]);

        // A name is unique within the vault, so writing one already present rotates it in place.
        const existing = yield* listVaultCredentials(apiKey, vaultId);
        const byName = new Map(
          existing.flatMap((credential) =>
            credential.auth?.secret_name ? [[credential.auth.secret_name, credential.id] as const] : [],
          ),
        );

        // Reported rather than ignored: silently succeeding would read as "the secret is gone" when
        // it is still bound under a different name.
        const missing = revoke.filter((name) => !byName.has(name));
        if (missing.length > 0) {
          return yield* Effect.fail(new CredentialNotBoundError({ context: { names: missing } }));
        }

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

        // Archived rather than deleted: it purges the secret and frees the name for a replacement.
        yield* Effect.forEach(
          revoke.flatMap((name) => {
            const credentialId = byName.get(name);
            return credentialId ? [credentialId] : [];
          }),
          (credentialId) => archiveVaultCredential(apiKey, vaultId, credentialId),
          { discard: true },
        );

        const bound = resolved.map((credential) => credential.auth.secret_name);
        // The session's record of what it holds, so a later `refresh` knows what to re-read.
        Obj.update(sessionObj, (sessionObj) => {
          const kept = (sessionObj.credentials ?? []).filter(
            (credential) => !revoke.includes(credential.as) && !credentials.some(({ as }) => as === credential.as),
          );
          sessionObj.credentials = [...kept, ...credentials];
        });

        return { sessionId, bound, revoked: [...revoke] };
      }),
    ),
  );

export default handler;
