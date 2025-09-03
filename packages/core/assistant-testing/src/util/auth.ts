//
// Copyright 2025 DXOS.org
//

import { HttpClient, HttpClientRequest } from '@effect/platform';
import { Effect } from 'effect';
import { Redacted } from 'effect';

import { type CredentialQuery, CredentialsService } from '@dxos/functions';

/**
 * Maps the request to include the API key from the credential.
 */
export const apiKeyAuth = (query: CredentialQuery) =>
  HttpClient.mapRequestEffect(
    Effect.fnUntraced(function* (request) {
      return HttpClientRequest.setHeaders(request, {
        Authorization: Redacted.value(yield* CredentialsService.getApiKey(query)),
      });
    }),
  );
