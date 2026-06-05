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
 * BYOK (Bring Your Own Key) header injector for AI-service traffic.
 *
 * Wraps the ambient {@link HttpClient.HttpClient} with a `mapRequestEffect` that looks up a
 * credential for the supplied upstream provider host (e.g. `'anthropic.com'`) from
 * {@link Credential.CredentialsService}. When a matching space `AccessToken` is present, its token
 * is attached as `X-BYOK` on outbound requests; otherwise the request is forwarded unchanged and
 * the AI service falls back to its server-side default key.
 *
 * The provider host matches `AccessToken.source` (the upstream provider's domain, not the proxy's).
 */
export const byokHeaderLayer = (
  providerHost: string,
): Layer.Layer<HttpClient.HttpClient, never, HttpClient.HttpClient | Credential.CredentialsService> =>
  Layer.effect(
    HttpClient.HttpClient,
    Effect.gen(function* () {
      const client = yield* HttpClient.HttpClient;
      // mapRequestEffect threads CredentialsService into the client type; callers must provide it
      // in the same fiber (space layer for Composer chat, FunctionContext for workers).
      return HttpClient.mapRequestEffect(client, (request) =>
        Effect.gen(function* () {
          const credentials = yield* Credential.CredentialsService;
          const matches = yield* Effect.promise(() => credentials.queryCredentials({ service: providerHost }));
          const apiKey = matches.find((credential) => credential.apiKey)?.apiKey;
          if (!apiKey) {
            return request;
          }
          return HttpClientRequest.setHeader(request, BYOK_HEADER, apiKey);
        }),
      ) as HttpClient.HttpClient;
    }),
  );
