//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Credential from '@dxos/compute/Credential';

import { ANTHROPIC_OAUTH_TOKEN_PREFIX, ANTHROPIC_SOURCE } from './constants';
import { MissingCredentialError } from './errors';

/**
 * How the resolved credential authenticates: an OAuth access token goes on `Authorization: Bearer`,
 * a Console API key on `x-api-key`. The two are not interchangeable — the API rejects either header
 * carrying the other kind of credential.
 */
export type AnthropicAuthScheme = 'oauth' | 'api-key';

export type AnthropicCredential = {
  token: string;
  scheme: AnthropicAuthScheme;
};

/**
 * Anthropic OAuth access tokens are `sk-ant-oat…`-prefixed, which is what separates a connection
 * authorized through the OAuth flow from a pasted Console API key (`sk-ant-api…`). The credential
 * store keeps both under the same service, so the prefix is the only discriminator available.
 */
const classify = (token: string): AnthropicAuthScheme =>
  token.startsWith(ANTHROPIC_OAUTH_TOKEN_PREFIX) ? 'oauth' : 'api-key';

/**
 * Resolves the Anthropic credential from the space's connected credentials — an OAuth access token
 * where the user connected their Claude account, otherwise an API key. A missing credential is a
 * typed failure so the model can prompt the user to connect rather than crashing.
 */
export const getCredential: Effect.Effect<AnthropicCredential, MissingCredentialError, Credential.CredentialsService> =
  Effect.gen(function* () {
    const credentials = yield* Credential.CredentialsService;
    const matches = yield* Effect.tryPromise({
      try: () => credentials.queryCredentials({ service: ANTHROPIC_SOURCE }),
      catch: (cause) => new MissingCredentialError({ cause }),
    });
    const token = matches.find((credential) => credential.apiKey)?.apiKey;
    if (!token) {
      return yield* Effect.fail(new MissingCredentialError());
    }

    return { token, scheme: classify(token) };
  });
