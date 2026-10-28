//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import * as Capability from '@dxos/app-framework/Capability';
import { Format, Obj, Ref } from '@dxos/echo';
import { AccessToken, Connection } from '@dxos/link';
import * as ConnectorError from '@dxos/plugin-connector/ConnectorError';
import * as ConnectorSpec from '@dxos/plugin-connector/ConnectorSpec';

import { makeClient } from '#client';

import { DEFAULT_SERVER_URL, LIGHTHOUSE_CONNECTOR_ID, LIGHTHOUSE_TOKEN_SOURCE } from '../constants.ts';
import { getEndpoint } from '../util/endpoint.ts';

const LABEL = 'Lighthouse';

const CredentialSchema = Schema.Struct({
  url: Schema.String.annotate({
    title: 'Server URL',
    description: 'The lighthouse daemon, e.g. http://127.0.0.1:4319',
  }),
  token: Schema.String.pipe(Format.FormatAnnotation.set(Format.TypeFormat.Password)).annotate({
    title: 'API token',
    description: 'From `lighthouse api token`',
  }),
});

type CredentialValues = Schema.Schema.Type<typeof CredentialSchema>;

const hostOf = (url: string) => {
  try {
    return new URL(url, 'http://localhost').host;
  } catch {
    return LIGHTHOUSE_TOKEN_SOURCE;
  }
};

/** Asks the server for its status, so a wrong URL or token fails in the form instead of on every later request. */
const probe = (url: string, token: string) =>
  makeClient({ url, token })
    .status()
    .pipe(Effect.mapError((error) => new ConnectorError.ConnectionTestError({ message: error.message, cause: error })));

/**
 * A lighthouse server: its URL and the workspace's API token. The token is the AccessToken; the URL rides in its
 * `account` (the identity the token belongs to), since a connection holds no other field for it.
 */
export const LighthouseConnector: ConnectorSpec.ConnectorEntry = {
  id: LIGHTHOUSE_CONNECTOR_ID,
  source: LIGHTHOUSE_TOKEN_SOURCE,
  label: LABEL,
  kind: 'custom',
  credentialForm: {
    schema: CredentialSchema,
    defaultValues: { url: DEFAULT_SERVER_URL, token: '' },
    onValidate: ({ values }: { values: CredentialValues }) => probe(values.url.trim(), values.token.trim()),
    onSubmit: ({ values, connector }: { values: CredentialValues; connector: ConnectorSpec.ConnectorEntry }) =>
      Effect.sync(() => {
        const url = values.url.trim();
        const accessToken = Obj.make(AccessToken.AccessToken, {
          source: hostOf(url),
          account: url,
          token: values.token.trim(),
        });
        const connection = Connection.make({
          name: connector.label ?? LABEL,
          connectorId: connector.id,
          accessToken: Ref.make(accessToken),
        });
        return { kind: 'complete' as const, accessToken, connection };
      }),
  },
  testConnection: ({ accessToken }) =>
    makeClient(getEndpoint(accessToken))
      .status()
      .pipe(
        Effect.mapError((error) => new ConnectorError.ConnectionTestError({ message: error.message, cause: error })),
      ),
  describeConnection: ({ accessToken }) => [{ label: 'Server', value: getEndpoint(accessToken).url }],
};

export default Capability.makeModule(() =>
  Effect.succeed(Capability.contribute(ConnectorSpec.Connector, [LighthouseConnector])),
);
