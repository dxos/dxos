//
// Copyright 2026 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as Effect from 'effect/Effect';

import { Database, Filter, Obj, Ref } from '@dxos/echo';
import { Operation } from '@dxos/operation';
import { IntegrationOperation } from '@dxos/plugin-integration/operations';
import { Integration } from '@dxos/plugin-integration/types';

import { TRELLO_SOURCE } from '../constants';
import { credentialsFromAccessToken, fetchMember } from '../services/trello-api';

/**
 * On Trello access-token creation:
 *  1. Populate `accessToken.account` with the authenticated user's identity
 *     (email, falling back to username) by calling `/members/me`.
 *  2. Auto-create an `Integration` wrapping the token if one doesn't already
 *     exist for this token. This is what makes the OAuth-preset path land in
 *     the "Integrations" section of the unified panel rather than "Custom tokens".
 *
 * Fires for tokens added via the manual entry form *and* the OAuth callback —
 * `TokensContainer.handleAddAccessToken` invokes `AccessTokenCreated` for both
 * paths, so this handler runs immediately as a result of the OAuth flow.
 */
const handler: Operation.WithHandler<typeof IntegrationOperation.AccessTokenCreated> =
  IntegrationOperation.AccessTokenCreated.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ accessToken }) {
        if (accessToken.source !== TRELLO_SOURCE) return;

        // 1. Fill in `account` from /members/me if missing.
        if (!accessToken.account) {
          const creds = credentialsFromAccessToken(accessToken);
          const member = yield* fetchMember(creds);
          Obj.change(accessToken, (mutable) => {
            (mutable as Obj.Mutable<typeof mutable>).account = member.email ?? member.username;
          });
        }

        // 2. Auto-create the Integration (if not already present for this token).
        const accessTokenDxn = Obj.getDXN(accessToken).toString();
        const existing = yield* Database.runQuery(Filter.type(Integration.Integration));
        const alreadyWrapped = existing.some(
          (integration) =>
            integration.accessToken.dxn?.toString?.() === accessTokenDxn ||
            integration.accessToken.target?.id === accessToken.id,
        );
        if (!alreadyWrapped) {
          yield* Database.add(
            Integration.make({
              accessToken: Ref.make(accessToken),
              targets: [],
            }),
          );
        }
      }, Effect.provide(FetchHttpClient.layer)),
    ),
  );

export default handler;
