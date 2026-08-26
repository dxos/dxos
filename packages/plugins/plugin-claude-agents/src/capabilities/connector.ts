//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import * as Capability from '@dxos/app-framework/Capability';
import * as Credential from '@dxos/compute/Credential';
import { Obj, Ref } from '@dxos/echo';
import { AccessToken, Connection } from '@dxos/link';
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
 * Pre-flight form offering both credential kinds. A Console API key stays reachable — the OAuth
 * client is workspace-scoped and an org may not want to grant it at all — so an entered key
 * completes the connection directly and an empty field falls through to the OAuth flow.
 */
const credentialForm: ConnectorSpec.CredentialForm<{ token?: string; account?: string }> = {
  schema: Schema.Struct({
    token: Schema.String.annotate({
      title: 'API key',
      description: 'Anthropic Console API key (sk-ant-api…). Leave empty to connect a Claude account instead.',
    }).pipe(Schema.optional),
    account: Schema.String.annotate({
      title: 'Account',
      description: 'Optional label for the connection.',
    }).pipe(Schema.optional),
  }),
  defaultValues: { token: '' },
  onSubmit: ({ values, connector }) =>
    Effect.sync(() => {
      const token = values.token?.trim();
      if (!token) {
        return { kind: 'oauth' } as const;
      }

      const accessToken = Obj.make(AccessToken.AccessToken, {
        source: ANTHROPIC_SOURCE,
        account: values.account,
        token,
      });
      const connection = Obj.make(Connection.Connection, {
        name: values.account ?? connector.label ?? ANTHROPIC_SOURCE,
        connectorId: connector.id,
        accessToken: Ref.make(accessToken),
      });
      return { kind: 'complete', accessToken, connection } as const;
    }),
};

/**
 * Contributes the Anthropic connector, which is authentication-only: it has no sync targets, it
 * exists so the managed-agent operations can run against a connected Claude account or a Console
 * API key, whichever the user supplies in the form.
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
        credentialForm,
        testConnection,
      },
    ]);
  }),
);
