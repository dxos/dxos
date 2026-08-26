//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Credential from '@dxos/compute/Credential';
import { Database } from '@dxos/echo';

import { type EnvironmentVariableCredential } from '#api';
import { type ClaudeAgentOperation } from '#types';

import { ANTHROPIC_SOURCE } from './constants';
import { CredentialResolutionError, MissingCredentialError } from './errors';

/**
 * Resolves the Anthropic API key from the space's connected credentials, as a typed failure when
 * there is none so the model can prompt the user to connect rather than crashing.
 */
export const getApiKey: Effect.Effect<string, MissingCredentialError, Credential.CredentialsService> = Effect.gen(
  function* () {
    const credentials = yield* Credential.CredentialsService;
    const matches = yield* Effect.tryPromise({
      try: () => credentials.queryCredentials({ service: ANTHROPIC_SOURCE }),
      catch: (cause) => new MissingCredentialError({ cause }),
    });
    const apiKey = matches.find((credential) => credential.apiKey)?.apiKey;
    if (!apiKey) {
      return yield* Effect.fail(new MissingCredentialError());
    }

    return apiKey;
  },
);

/**
 * Resolves the referenced `AccessToken` objects into vault credentials. The secret is read at bind
 * time and handed straight to the control plane, so it never passes through a message, a transcript
 * or an operation result — the reference is what the model sees and passes around.
 *
 * `scope` defaults to the token's own source, because a credential minted for one service has no
 * business being substituted into a request to another. A name repeated in one request keeps its
 * last entry: names are unique within a vault, so binding both would be rejected as a conflict.
 */
export const toVaultCredentials = Effect.fn('toVaultCredentials')(function* (
  credentials: readonly ClaudeAgentOperation.SessionCredential[],
) {
  const deduped = [...new Map(credentials.map((credential) => [credential.as, credential])).values()];
  return yield* Effect.forEach(deduped, ({ token, as, scope }) =>
    Effect.gen(function* () {
      const tokenObj = yield* Database.load(token);
      // Resolved through the credentials service rather than read off the object: a server-custodied
      // token stores a placeholder locally and only the service can exchange it for a value.
      const secret = yield* Credential.getApiKeyValue({ accessTokenId: tokenObj.id }).pipe(
        Effect.catchCause((cause) => Effect.fail(new CredentialResolutionError({ cause, context: { as } }))),
      );
      // Binding an empty value would surface inside the container as an opaque 401, far from here.
      if (secret.length === 0) {
        return yield* Effect.fail(new CredentialResolutionError({ context: { as } }));
      }
      const hosts = scope?.length ? [...scope] : [tokenObj.source];
      return {
        display_name: `${as} (${tokenObj.source})`,
        auth: {
          type: 'environment_variable' as const,
          secret_name: as,
          secret_value: secret,
          networking: { type: 'limited' as const, allowed_hosts: hosts },
        },
      } satisfies EnvironmentVariableCredential;
    }),
  );
});
