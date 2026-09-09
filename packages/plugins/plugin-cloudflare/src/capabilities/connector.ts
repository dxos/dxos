//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import * as Capability from '@dxos/app-framework/Capability';
import * as Credential from '@dxos/compute/Credential';
import { Obj } from '@dxos/echo';
import { ConnectionTestError } from '@dxos/plugin-connector';
import * as ConnectorSpec from '@dxos/plugin-connector/ConnectorSpec';
import { OAuthProvider } from '@dxos/protocols';

import { CloudflareApi } from '#services';

import { CLOUDFLARE_OAUTH_SCOPES, CLOUDFLARE_PROVIDER_ID, CLOUDFLARE_SOURCE } from '../constants';

/**
 * Labels the connection with the authenticated user's email, falling back to the first account name
 * for a grant that carries `account:read` but not `user:read`. Failures are elevated with
 * {@link Effect.orDie}; plugin-connector logs defects from the runner and continues, so a failed
 * lookup leaves the label empty rather than losing the Connection already created.
 */
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
    );
    if (!label) {
      return;
    }
    Obj.update(accessToken, (accessToken) => {
      accessToken.account = label;
    });
  }).pipe(Effect.orDie);

/**
 * Cloudflare `testConnection`: list accounts with the stored token. Reads the narrowest scope the
 * connector asks for, so a grant that lost `user:read` still passes. A revoked or expired grant
 * surfaces as a user-facing error and the connection UI offers to reauthenticate.
 */
const testConnection: ConnectorSpec.TestConnection = ({ accessToken }) =>
  Effect.flatMap(Credential.getApiKeyValue({ accessTokenId: accessToken.id }), (token) =>
    CloudflareApi.fetchAccounts().pipe(Effect.provide(Layer.succeed(CloudflareApi.CloudflareCredentials, { token }))),
  ).pipe(
    Effect.asVoid,
    Effect.mapError(
      () => new ConnectionTestError({ message: 'Cloudflare rejected the credential. Reauthenticate to continue.' }),
    ),
  );

/**
 * Contributes the Cloudflare connector: an OAuth grant against the `'cloudflare.com'` source and
 * nothing else. There is no `sync` — the connector authenticates, and whatever wants to call the
 * Cloudflare v4 API resolves the stored token through `CredentialsService` by that source.
 *
 * The grant is broad — deploy and resource-management scopes, not just the two reads this file
 * uses. See {@link CLOUDFLARE_OAUTH_SCOPES} for what is in it and why.
 */
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
