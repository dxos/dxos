//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { Capability } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';
import { ConnectionTestError, Connector, type OnTokenCreated, type TestConnection } from '@dxos/plugin-connector';
import { OAuthProvider } from '@dxos/protocols';

import { TRELLO_SOURCE } from '../constants';
import { TrelloApi } from '../services';
import { TrelloOperation } from '../types';

/**
 * Service-specific token-created hook for Trello.
 *
 * Calls Trello's `/members/me` to populate `accessToken.account` with the
 * authenticated user's email (falling back to username). Failures are elevated
 * with {@link Effect.orDie}; plugin-connector logs defects from the runner and
 * continues so a failed `/members/me` cannot block the Connection already created.
 *
 * The wrapping Connection itself is auto-created by plugin-connector BEFORE
 * this runs.
 */
const onTokenCreated: OnTokenCreated = ({ accessToken }) =>
  Effect.gen(function* () {
    if (accessToken.account) {
      return;
    }
    const creds = yield* TrelloApi.credentialsFromAccessToken(accessToken);
    const member = yield* TrelloApi.fetchMember().pipe(
      Effect.provide(Layer.succeed(TrelloApi.TrelloCredentials, creds)),
    );
    Obj.update(accessToken, (accessToken) => {
      accessToken.account = member.email ?? member.username;
    });
  }).pipe(Effect.orDie);

/**
 * Trello `testConnection`: `GET /members/me` with the stored token. A rejected
 * token or transport failure surfaces as a user-facing error so the connection
 * UI can offer to reauthenticate.
 */
const testConnection: TestConnection = ({ accessToken }) =>
  Effect.gen(function* () {
    const creds = yield* TrelloApi.credentialsFromAccessToken(accessToken);
    yield* TrelloApi.fetchMember().pipe(Effect.provide(Layer.succeed(TrelloApi.TrelloCredentials, creds)));
  }).pipe(
    Effect.mapError(
      () => new ConnectionTestError({ message: 'Trello rejected the credential. Reauthenticate to continue syncing.' }),
    ),
  );

/**
 * Contributes a single `Connector` entry that wires Trello's discovery,
 * target materialization, sync operation, and token-created hook to the
 * `'trello.com'` source. plugin-connector routes connections to connectors
 * by `connectorId`.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return [
      Capability.provide(Connector, [
        {
          id: 'trello',
          source: TRELLO_SOURCE,
          label: 'Trello',
          oauth: {
            provider: OAuthProvider.TRELLO,
            scopes: [],
          },
          getSyncTargets: TrelloOperation.GetTrelloBoards,
          materializeTarget: TrelloOperation.MaterializeTrelloTarget,
          sync: TrelloOperation.SyncTrelloBoard,
          onTokenCreated,
          testConnection,
        },
      ]),
    ];
  }),
);
