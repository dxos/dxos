//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { Capability } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';
import {
  IntegrationProvider as IntegrationProviderCapability,
  type OnTokenCreated,
} from '@dxos/plugin-integration/types';
import { OAuthProvider } from '@dxos/protocols';

import { TRELLO_SOURCE } from '../constants';
import { TrelloOperation } from '../operations';
import { TrelloApi } from '../services';

/**
 * Service-specific token-created hook for Trello.
 *
 * Calls Trello's `/members/me` to populate `accessToken.account` with the
 * authenticated user's email (falling back to username). Failures are elevated
 * with {@link Effect.orDie}; plugin-integration logs defects from the runner and
 * continues so a failed `/members/me` cannot block the Integration already created.
 *
 * The wrapping Integration itself is auto-created by plugin-integration BEFORE
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
    Obj.change(accessToken, (accessToken) => {
      accessToken.account = member.email ?? member.username;
    });
  }).pipe(Effect.orDie);

/**
 * Contributes a single `IntegrationProvider` entry that wires Trello's two operations
 * and the token-created hook to the `'trello.com'` source. plugin-integration looks
 * up providers by source string.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributes(IntegrationProviderCapability, [
      {
        id: 'trello',
        source: TRELLO_SOURCE,
        label: 'Trello',
        oauth: {
          provider: OAuthProvider.TRELLO,
          scopes: [],
        },
        getSyncTargets: TrelloOperation.GetTrelloBoards,
        sync: TrelloOperation.SyncTrelloBoard,
        onTokenCreated,
      },
    ]);
  }),
);
