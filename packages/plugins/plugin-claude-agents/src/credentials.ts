//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Credential from '@dxos/compute/Credential';

import { ANTHROPIC_SOURCE } from './constants';
import { MissingCredentialError } from './errors';

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
