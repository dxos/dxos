//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import * as Capability from '@dxos/app-framework/Capability';
import * as Credential from '@dxos/compute/Credential';
import { Obj } from '@dxos/echo';
import { ConnectionTestError } from '@dxos/plugin-connector';
import * as ConnectorEvents from '@dxos/plugin-connector/ConnectorEvents';
import * as ConnectorSpec from '@dxos/plugin-connector/ConnectorSpec';
import { OAuthProvider } from '@dxos/protocols';

import { LinearOperation } from '#types';

import { LINEAR_PROVIDER_ID, LINEAR_SOURCE } from '../constants.ts';
import { LinearApi } from '../services/index.ts';

/**
 * Service-specific token-created hook for Linear.
 *
 * Calls Linear's `viewer` GraphQL query to populate `accessToken.account`
 * with the authenticated user's email (falling back to display name).
 * Failures are elevated with {@link Effect.orDie}; plugin-connector logs
 * defects from the runner and continues so a failed lookup cannot block the
 * Connection already created.
 */
const onTokenCreated: ConnectorSpec.OnTokenCreated = ({ accessToken }) =>
  Effect.gen(function* () {
    if (accessToken.account) {
      return;
    }
    const token = yield* Credential.getApiKeyValue({ accessTokenId: accessToken.id });
    const viewer = yield* LinearApi.fetchViewer().pipe(
      Effect.provide(Layer.succeed(LinearApi.LinearCredentials, { token })),
    );
    Obj.update(accessToken, (accessToken) => {
      accessToken.account = viewer.email ?? viewer.name;
    });
  }).pipe(Effect.orDie);

/**
 * Linear `testConnection`: run the `viewer` query with the stored token. A
 * rejected token or transport failure surfaces as a user-facing error so the
 * connection UI can offer to reauthenticate.
 */
const testConnection: ConnectorSpec.TestConnection = ({ accessToken }) =>
  Effect.flatMap(Credential.getApiKeyValue({ accessTokenId: accessToken.id }), (token) =>
    LinearApi.fetchViewer().pipe(Effect.provide(Layer.succeed(LinearApi.LinearCredentials, { token }))),
  ).pipe(
    Effect.asVoid,
    Effect.mapError(
      () => new ConnectionTestError({ message: 'Linear rejected the credential. Reauthenticate to continue syncing.' }),
    ),
  );

export const Connector = Capability.makeModule(
  'LinearConnector',
  { provides: [ConnectorSpec.Connector], activatesOn: ConnectorEvents.Start },
  Effect.fnUntraced(function* () {
    return Capability.contribute(ConnectorSpec.Connector, [
      {
        id: LINEAR_PROVIDER_ID,
        source: LINEAR_SOURCE,
        label: 'Linear',
        oauth: {
          provider: OAuthProvider.LINEAR,
          scopes: ['read', 'write'],
        },
        sync: {
          operation: LinearOperation.SyncLinearTeams,
          getTargets: LinearOperation.GetLinearTeams,
          materializeTarget: LinearOperation.MaterializeLinearTarget,
          optionsSchema: LinearOperation.SyncOptions,
        },
        onTokenCreated,
        testConnection,
      },
    ]);
  }),
);
