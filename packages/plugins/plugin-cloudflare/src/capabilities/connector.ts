//
// Copyright 2026 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';

import * as Capability from '@dxos/app-framework/Capability';
import * as Credential from '@dxos/compute/Credential';
import { Obj } from '@dxos/echo';
import { ConnectionTestError } from '@dxos/plugin-connector';
import * as ConnectorSpec from '@dxos/plugin-connector/ConnectorSpec';
import { OAuthProvider } from '@dxos/protocols';

import { CloudflareApi, CloudflareHttpClientLayer } from '#services';

import { CLOUDFLARE_OAUTH_SCOPES, CLOUDFLARE_PROVIDER_ID, CLOUDFLARE_SOURCE } from '../constants';

/** `orDie` is safe: the coordinator catches defects from this hook and keeps the Connection. */
const onTokenCreated: ConnectorSpec.OnTokenCreated = ({ accessToken }) =>
  Effect.gen(function* () {
    if (accessToken.account) {
      return;
    }
    const token = yield* Credential.getApiKeyValue({ accessTokenId: accessToken.id });
    const label = yield* CloudflareApi.fetchUser().pipe(
      Effect.map((user) => user.email ?? user.username ?? undefined),
      Effect.catch(() => Effect.map(CloudflareApi.fetchAccounts(), (accounts) => accounts[0]?.name)),
      Effect.provide(Layer.succeed(CloudflareApi.CloudflareCredentials, { token })),
      Effect.provide(CloudflareHttpClientLayer),
    );
    if (!label) {
      return;
    }
    Obj.update(accessToken, (accessToken) => {
      accessToken.account = label;
    });
  }).pipe(Effect.orDie);

const isCredentialRejection = (error: CloudflareApi.CloudflareError): boolean =>
  !Cause.isTimeoutError(error) && !(error instanceof Schema.SchemaError) && error.reason._tag === 'StatusCodeError';

const testConnection: ConnectorSpec.TestConnection = ({ accessToken }) =>
  Effect.flatMap(Credential.getApiKeyValue({ accessTokenId: accessToken.id }), (token) =>
    CloudflareApi.fetchAccounts().pipe(
      Effect.provide(Layer.succeed(CloudflareApi.CloudflareCredentials, { token })),
      Effect.provide(CloudflareHttpClientLayer),
    ),
  ).pipe(
    Effect.asVoid,
    Effect.mapError(
      (error) =>
        new ConnectionTestError({
          message: isCredentialRejection(error)
            ? 'Cloudflare rejected the credential. Reauthenticate to continue.'
            : 'Could not reach Cloudflare. Try again.',
        }),
    ),
  );

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contribute(ConnectorSpec.Connector, [
      {
        id: CLOUDFLARE_PROVIDER_ID,
        source: CLOUDFLARE_SOURCE,
        label: 'Cloudflare',
        oauth: {
          provider: OAuthProvider.CLOUDFLARE,
          scopes: CLOUDFLARE_OAUTH_SCOPES,
        },
        onTokenCreated,
        testConnection,
      },
    ]);
  }),
);
