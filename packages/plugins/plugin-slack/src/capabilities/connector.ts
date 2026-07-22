//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { Capability } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';
import { ConnectionTestError, Connector, type OnTokenCreated, type TestConnection } from '@dxos/plugin-connector';
import { OAuthProvider } from '@dxos/protocols';

import { SLACK_SCOPES, SLACK_SOURCE } from '../constants';
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
 * Slack `testConnection`: call `auth.test` with the stored token. A rejected
 * token or transport failure surfaces as a user-facing error so the connection
 * UI can offer to reauthenticate.
 */
const testConnection: TestConnection = ({ accessToken }) =>
  SlackApi.fetchAuthTest().pipe(
    Effect.provide(Layer.succeed(SlackApi.SlackCredentials, { token: accessToken.token })),
    Effect.asVoid,
    Effect.mapError(
      () => new ConnectionTestError({ message: 'Slack rejected the credential. Reauthenticate to continue syncing.' }),
    ),
  );

/**
 * Contributes a single `Connector` entry that wires Slack's auth, discovery,
 * materialization and sync to the `'slack.com'` source.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.provide(Connector, [
      {
        id: 'slack',
        source: SLACK_SOURCE,
        label: 'Slack',
        oauth: {
          provider: OAuthProvider.SLACK,
          scopes: SLACK_SCOPES,
        },
        getSyncTargets: SlackOperation.GetSlackChannels,
        materializeTarget: SlackOperation.MaterializeSlackTarget,
        sync: SlackOperation.SyncSlackChannel,
        onTokenCreated,
        testConnection,
      },
    ]);
  }),
);
