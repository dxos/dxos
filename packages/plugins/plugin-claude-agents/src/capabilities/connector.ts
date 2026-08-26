//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as Credential from '@dxos/compute/Credential';
import { ConnectionTestError } from '@dxos/plugin-connector';
import * as ConnectorSpec from '@dxos/plugin-connector/ConnectorSpec';
import { OAuthProvider } from '@dxos/protocols';

import { verifyCredential } from '#api';

import { ANTHROPIC_OAUTH_TOKEN_PREFIX, ANTHROPIC_PROVIDER_ID, ANTHROPIC_SCOPES, ANTHROPIC_SOURCE } from '../constants';

/**
 * Anthropic `testConnection`: one authenticated read with the stored credential. A rejected token
 * (expired, or a revoked grant) surfaces as a user-facing error so the connection UI can offer to
 * reauthenticate before an agent run fails mid-session.
 */
const testConnection: ConnectorSpec.TestConnection = ({ accessToken }) =>
  Effect.flatMap(Credential.getApiKeyValue({ accessTokenId: accessToken.id }), (token) =>
    verifyCredential({
      token,
      scheme: token.startsWith(ANTHROPIC_OAUTH_TOKEN_PREFIX) ? 'oauth' : 'api-key',
    }),
  ).pipe(
    Effect.asVoid,
    Effect.mapError(
      () =>
        new ConnectionTestError({
          message: 'Anthropic rejected the credential. Reauthenticate to continue running agents.',
        }),
    ),
  );

/**
 * Contributes the Anthropic connector, which is authentication-only: it has no sync targets, it
 * exists so a user can connect their Claude account and have the managed-agent operations run
 * against the resulting OAuth token instead of a hand-pasted Console API key.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contribute(ConnectorSpec.Connector, [
      {
        id: ANTHROPIC_PROVIDER_ID,
        source: ANTHROPIC_SOURCE,
        label: 'Anthropic',
        oauth: {
          provider: OAuthProvider.ANTHROPIC,
          scopes: ANTHROPIC_SCOPES,
        },
        testConnection,
      },
    ]);
  }),
);
