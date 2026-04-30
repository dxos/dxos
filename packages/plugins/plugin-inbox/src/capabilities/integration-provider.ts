//
// Copyright 2026 DXOS.org
//

import * as HttpClient from '@effect/platform/HttpClient';
import * as HttpClientRequest from '@effect/platform/HttpClientRequest';
import * as HttpClientResponse from '@effect/platform/HttpClientResponse';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';
import { withAuthorization } from '@dxos/functions';
import {
  IntegrationProvider as IntegrationProviderCapability,
  type OnTokenCreated,
} from '@dxos/plugin-integration/capabilities';

const GOOGLE_SOURCE = 'google.com';

const GoogleUserInfo = Schema.Struct({
  email: Schema.optional(Schema.String),
});

/**
 * Service-specific token-created hook for Google.
 *
 * Calls Google's `/oauth2/v3/userinfo` endpoint to populate `accessToken.account`
 * with the authenticated user's email. The HttpClient's tracer is disabled
 * around the request to work around a CORS issue with traced requests
 * (see https://github.com/Effect-TS/effect/issues/4568).
 */
const onTokenCreated: OnTokenCreated = (accessToken) =>
  Effect.gen(function* () {
    if (!accessToken.token || accessToken.account) return;

    const httpClient = yield* HttpClient.HttpClient.pipe(
      Effect.map(withAuthorization(accessToken.token, 'Bearer')),
    );
    const httpClientWithTracerDisabled = httpClient.pipe(HttpClient.withTracerDisabledWhen(() => true));

    const userInfo = yield* HttpClientRequest.get('https://www.googleapis.com/oauth2/v3/userinfo').pipe(
      httpClientWithTracerDisabled.execute,
      Effect.flatMap(HttpClientResponse.schemaBodyJson(GoogleUserInfo)),
      Effect.scoped,
    );

    if (userInfo.email) {
      Obj.change(accessToken, (accessToken) => {
        accessToken.account = userInfo.email;
      });
    }
  }).pipe(Effect.mapError((error) => (error instanceof Error ? error : new Error(String(error)))));

/**
 * Contributes a shell `IntegrationProvider` for Google.
 *
 * Registers `source: 'google.com'` and the `onTokenCreated` hook that fills in
 * the user's email. No sync operations yet — Calendar/Mailbox sync is out of
 * scope for this contribution and lives in plugin-inbox's existing handlers.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributes(IntegrationProviderCapability, [
      {
        source: GOOGLE_SOURCE,
        onTokenCreated,
      },
    ]);
  }),
);
