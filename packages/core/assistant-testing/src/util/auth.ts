import { CredentialsService, type CredentialQuery } from '@dxos/functions';
import { HttpClient, HttpClientRequest } from '@effect/platform';
import { Effect } from 'effect';
import { Redacted } from 'effect';

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
