//
// Copyright 2026 DXOS.org
//

import * as HttpClient from '@effect/platform/HttpClient';
import * as HttpClientRequest from '@effect/platform/HttpClientRequest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { BYOK_HEADER } from '@dxos/protocols';

import * as Credential from './Credential';

/**
 * Wraps an `HttpClient` so outbound requests carry `X-BYOK: <apiKey>` whenever the active space
 * has an `AccessToken` for `providerHost`. Lookup failures pass the request through unchanged.
 */
export const byokHeaderLayer = (
  providerHost: string,
): Layer.Layer<HttpClient.HttpClient, never, HttpClient.HttpClient | Credential.CredentialsService> =>
  Layer.effect(
    HttpClient.HttpClient,
    Effect.gen(function* () {
      const client = yield* HttpClient.HttpClient;
      const credentials = yield* Credential.CredentialsService;
      return HttpClient.mapRequestEffect(client, (request) =>
        Effect.gen(function* () {
          const matches = yield* Effect.tryPromise(() => credentials.queryCredentials({ service: providerHost })).pipe(
            Effect.orElseSucceed((): Credential.ServiceCredential[] => []),
          );
          const apiKey = matches.find((credential) => credential.apiKey)?.apiKey;
          return apiKey ? HttpClientRequest.setHeader(request, BYOK_HEADER, apiKey) : request;
        }),
      );
    }),
  );
