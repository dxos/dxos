//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { Capability } from '@dxos/app-framework';
import { Database, Obj } from '@dxos/echo';
import { Connector, type MaterializeTarget, type OnTokenCreated } from '@dxos/plugin-connector';
import { OAuthProvider } from '@dxos/protocols';

import { SLACK_SCOPES, SLACK_SOURCE } from '../constants';
import { findOrCreateChannelForTarget } from '../operations/sync';
import { SlackApi } from '../services';
import { SlackOperation } from '../types';

/**
 * Service-specific token-created hook for Slack.
 *
 * Calls Slack's `auth.test` to populate `accessToken.account` with the
 * authenticated user's display name (falling back to user id) and the team
 * domain. Failures are elevated with {@link Effect.orDie}; plugin-connector
 * logs defects from the runner and continues so a failed `auth.test` cannot
 * block the Connection already created.
 */
const onTokenCreated: OnTokenCreated = ({ accessToken }) =>
  Effect.gen(function* () {
    if (accessToken.account) {
      return;
    }
    const result = yield* SlackApi.fetchAuthTest().pipe(
      Effect.provide(Layer.succeed(SlackApi.SlackCredentials, { token: accessToken.token })),
    );
    Obj.update(accessToken, (accessToken) => {
      // Prefer a `<user>@<team>` shape because it reads naturally in the
      // connections list and stays unique per workspace, but fall back to
      // either side if Slack returned only one.
      if (result.user && result.team) {
        accessToken.account = `${result.user}@${result.team}`;
      } else {
        accessToken.account = result.user ?? result.team ?? result.user_id ?? '';
      }
    });
  }).pipe(Effect.orDie);

/**
 * Materializes the empty local Channel root for a Slack conversation so a
 * {@link SyncBinding} relation can be created eagerly. Idempotent: re-running
 * for the same `(db, remoteTarget)` returns the existing Channel. Slack is a
 * multi-target connector, so `remoteTarget` is always supplied.
 */
const materializeTarget: MaterializeTarget = ({ remoteTarget, db }) =>
  Effect.gen(function* () {
    if (!remoteTarget) {
      return yield* Effect.die(new Error('Slack materializeTarget requires a remoteTarget'));
    }
    return yield* findOrCreateChannelForTarget({ remoteId: remoteTarget.id, name: remoteTarget.name });
  }).pipe(Effect.provide(Database.layer(db)));

/**
 * Contributes a single `Connector` entry that wires Slack's auth, discovery,
 * materialization and sync to the `'slack.com'` source.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributes(Connector, [
      {
        id: 'slack',
        source: SLACK_SOURCE,
        label: 'Slack',
        oauth: {
          provider: OAuthProvider.SLACK,
          scopes: SLACK_SCOPES,
        },
        getSyncTargets: SlackOperation.GetSlackChannels,
        materializeTarget,
        sync: SlackOperation.SyncSlackChannel,
        onTokenCreated,
      },
    ]);
  }),
);
