//
// Copyright 2026 DXOS.org
//

import * as HttpClient from '@effect/platform/HttpClient';
import * as HttpClientRequest from '@effect/platform/HttpClientRequest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { Credential } from '@dxos/compute';

/**
 * BYOK (Bring Your Own Key) header injector for AI-service traffic.
 *
 * Wraps the ambient {@link HttpClient.HttpClient} with a `mapRequestEffect` that looks up a
 * credential for the supplied upstream provider host (e.g. `'anthropic.com'`) from
 * {@link Credential.CredentialsService}. When a matching {@link AccessToken} with a non-empty
 * `apiKey` is present in the space, its token is attached as `X-BYOK` on outbound requests;
 * otherwise the request is forwarded unchanged and the AI service falls back to its server-side
 * default key.
 *
 * The provider host matches the `source` field of `AccessToken` (the upstream provider's domain,
 * not the proxy's). The header travels through the AI-service proxy where it is unpacked.
 */
export const byokHeaderLayer = (providerHost: string) =>
  Layer.effect(
    HttpClient.HttpClient,
    Effect.gen(function* () {
      const client = yield* HttpClient.HttpClient;
      const credentials = yield* Credential.CredentialsService;
      return HttpClient.mapRequestEffect(client, (request) =>
        Effect.gen(function* () {
          const matches = yield* Effect.promise(() => credentials.queryCredentials({ service: providerHost }));
          const apiKey = matches.find((credential) => credential.apiKey)?.apiKey;
          if (!apiKey) {
            return request;
          }
          return HttpClientRequest.setHeader(request, 'X-BYOK', apiKey);
        }),
      );
    }),
  );
