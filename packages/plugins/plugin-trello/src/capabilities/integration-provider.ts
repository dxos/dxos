//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { Capability } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';
import { Connector, type OnTokenCreated } from '@dxos/plugin-connector';
import { OAuthProvider } from '@dxos/protocols';

import { TRELLO_SOURCE } from '../constants';
import { materializeTarget } from '../operations/sync';
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
 * Contributes a single `Connector` entry that wires Trello's discovery,
 * target materialization, sync operation, and token-created hook to the
 * `'trello.com'` source. plugin-connector routes connections to connectors
 * by `connectorId`.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributes(Connector, [
      {
        id: 'trello',
        source: TRELLO_SOURCE,
        label: 'Trello',
        oauth: {
          provider: OAuthProvider.TRELLO,
          scopes: [],
        },
        getSyncTargets: TrelloOperation.GetTrelloBoards,
        materializeTarget,
        sync: TrelloOperation.SyncTrelloBoard,
        onTokenCreated,
      },
    ]);
  }),
);
