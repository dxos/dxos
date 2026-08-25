//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Credential from '@dxos/compute/Credential';

import { ANTHROPIC_SOURCE } from './constants';
import { MissingCredentialError } from './errors';

/**
 * Resolves the Anthropic API key from the space's connected credentials.
 *
 * Queries rather than calling `Credential.getApiKeyValue`, whose lookup dies on a missing
 * credential: absence is the ordinary "not connected yet" state and has to reach the model as a
 * typed failure it can prompt the user about.
 */
export const getApiKey: Effect.Effect<string, MissingCredentialError, Credential.CredentialsService> = Effect.gen(
  function* () {
    const credentials = yield* Credential.CredentialsService;
    const matches = yield* Effect.promise(() => credentials.queryCredentials({ service: ANTHROPIC_SOURCE }));
    const apiKey = matches.find((credential) => credential.apiKey)?.apiKey;
    if (!apiKey) {
      return yield* Effect.fail(new MissingCredentialError());
    }

    return apiKey;
  },
);
