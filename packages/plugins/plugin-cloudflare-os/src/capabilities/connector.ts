//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import * as Capability from '@dxos/app-framework/Capability';
import { Format, Obj, Ref, Type } from '@dxos/echo';
import { AccessToken, Connection } from '@dxos/link';
import * as ConnectorError from '@dxos/plugin-connector/ConnectorError';
import * as ConnectorSpec from '@dxos/plugin-connector/ConnectorSpec';

import { Client, CloudflareOsError } from '#api';
import { CloudflareOs, CloudflareOsOperation } from '#types';

import { CLOUDFLARE_OS_CONNECTOR_ID } from '../constants.ts';

const LABEL = 'Cloudflare OS';

/** The deployment and the password account to sign in with; the password is exchanged for a session token. */
const SignInForm = Schema.Struct({
  url: Schema.String.annotate({ title: 'Deployment', description: 'The Cloudflare OS URL' }),
  username: Schema.String.annotate({ title: 'Username' }),
  password: Schema.String.pipe(Format.FormatAnnotation.set(Format.TypeFormat.Password)).annotate({
    title: 'Password',
  }),
});

type SignInValues = Schema.Schema.Type<typeof SignInForm>;

/** The deployment's origin; https only, since sign-in sends the password hash, which acts as the credential. */
const normalizeUrl = (url: string): Effect.Effect<string, CloudflareOsError> =>
  Effect.try({
    try: () => new URL(url.trim()),
    catch: (cause) => new CloudflareOsError({ message: 'Enter a valid https URL for the deployment.', cause }),
  }).pipe(
    Effect.filterOrFail(
      (parsed) => parsed.protocol === 'https:',
      () => new CloudflareOsError({ message: 'The deployment URL must use https.' }),
    ),
    Effect.map((parsed) => parsed.origin),
  );

/** Signs in once, storing the session token rather than the password. */
const onSubmit: ConnectorSpec.CredentialForm<SignInValues>['onSubmit'] = Effect.fnUntraced(function* ({
  values,
  connector,
}) {
  const url = yield* normalizeUrl(values.url);
  const username = values.username.trim().toLowerCase();
  const token = yield* Client.login({ url, username, password: values.password });
  const accessToken = Obj.make(AccessToken.AccessToken, {
    source: Client.hostFromUrl(url),
    account: username,
    token,
  });
  const connection = Obj.make(Connection.Connection, {
    name: `${connector.label ?? LABEL} · ${username}`,
    connectorId: connector.id,
    accessToken: Ref.make(accessToken),
  });
  return { kind: 'complete' as const, accessToken, connection };
});

/** The stored session token still opens the account. */
const testConnection: ConnectorSpec.TestConnection = ({ accessToken }) =>
  Client.authenticate({ url: Client.urlFromHost(accessToken.source), token: accessToken.token }).pipe(
    Effect.scoped,
    Effect.asVoid,
    Effect.mapError((error) => new ConnectorError.ConnectionTestError({ message: error.message })),
  );

/**
 * A Cloudflare OS account on a deployment. Each space binds one of the account's workspaces (or a new
 * one) as its sync target; syncing refreshes the workspace's title and gadget list.
 */
export const CloudflareOsConnector: ConnectorSpec.ConnectorEntry = {
  id: CLOUDFLARE_OS_CONNECTOR_ID,
  source: Client.hostFromUrl(Client.DEFAULT_URL),
  label: LABEL,
  kind: 'user',
  credentialForm: {
    schema: SignInForm,
    defaultValues: { url: Client.DEFAULT_URL, username: '', password: '' },
    onSubmit,
  },
  testConnection,
  sync: {
    operation: CloudflareOsOperation.SyncWorkspaces,
    targetTypename: Type.getTypename(CloudflareOs.Workspace),
    getTargets: CloudflareOsOperation.GetWorkspaces,
    materializeTarget: CloudflareOsOperation.MaterializeWorkspace,
    auto: true,
  },
  describeConnection: ({ accessToken }) => [
    { label: 'Deployment', value: Client.urlFromHost(accessToken.source) },
    { label: 'Account', value: accessToken.account ?? '' },
  ],
};

export default Capability.makeModule(() =>
  Effect.succeed(Capability.contribute(ConnectorSpec.Connector, [CloudflareOsConnector])),
);
