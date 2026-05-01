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
} from '@dxos/plugin-integration/capabilities';
import { OAuthProvider } from '@dxos/protocols';

import { TRELLO_SOURCE } from '../constants';
import { GetTrelloBoards, SyncTrelloBoard } from '../operations';
import { TrelloCredentials, credentialsFromAccessToken, fetchMember } from '../services/trello-api';

/**
 * Service-specific token-created hook for Trello.
 *
 * Calls Trello's `/members/me` to populate `accessToken.account` with the
 * authenticated user's email (falling back to username). Errors propagate as
 * Effect failures — plugin-integration logs them and continues so a misformed
 * token can't block the wrapping Integration from being created.
 *
 * The wrapping Integration itself is auto-created by plugin-integration BEFORE
 * this runs.
 */
const onTokenCreated: OnTokenCreated = ({ accessToken }) =>
  Effect.gen(function* () {
    if (accessToken.account) return;
    const creds = yield* Effect.try({
      try: () => credentialsFromAccessToken(accessToken),
      catch: (error) => (error instanceof Error ? error : new Error(String(error))),
    });
    const member = yield* fetchMember().pipe(Effect.provide(Layer.succeed(TrelloCredentials, creds)));
    Obj.change(accessToken, (accessToken) => {
      accessToken.account = member.email ?? member.username;
    });
  });

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
        getSyncTargets: GetTrelloBoards,
        sync: SyncTrelloBoard,
        onTokenCreated,
      },
    ]);
  }),
);
