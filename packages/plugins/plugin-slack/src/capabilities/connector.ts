//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import * as Capability from '@dxos/app-framework/Capability';
import * as Credential from '@dxos/compute/Credential';
import { Obj } from '@dxos/echo';
import { ConnectionTestError } from '@dxos/plugin-connector';
import * as ConnectorSpec from '@dxos/plugin-connector/ConnectorSpec';
import { OAuthProvider } from '@dxos/protocols';

import { SlackOperation } from '#types';

import { SLACK_SCOPES, SLACK_SOURCE } from '../constants.ts';
import { SlackApi } from '../services/index.ts';

/**
 * Service-specific token-created hook for Slack.
 *
 * Calls Slack's `auth.test` to populate `accessToken.account` with the
 * authenticated user's display name (falling back to user id) and the team
 * domain. Failures are elevated with {@link Effect.orDie}; plugin-connector
 * logs defects from the runner and continues so a failed `auth.test` cannot
 * block the Connection already created.
 */
const onTokenCreated: ConnectorSpec.OnTokenCreated = ({ accessToken }) =>
  Effect.gen(function* () {
    if (accessToken.account) {
      return;
    }
    const token = yield* Credential.getApiKeyValue({ accessTokenId: accessToken.id });
    const result = yield* SlackApi.fetchAuthTest().pipe(
      Effect.provide(Layer.succeed(SlackApi.SlackCredentials, { token })),
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
const testConnection: ConnectorSpec.TestConnection = ({ accessToken }) =>
  Effect.flatMap(Credential.getApiKeyValue({ accessTokenId: accessToken.id }), (token) =>
    SlackApi.fetchAuthTest().pipe(Effect.provide(Layer.succeed(SlackApi.SlackCredentials, { token }))),
  ).pipe(
    Effect.asVoid,
    Effect.mapError(
      () => new ConnectionTestError({ message: 'Slack rejected the credential. Reauthenticate to continue syncing.' }),
    ),
  );

/**
 * Contributes a single `ConnectorSpec.Connector` entry that wires Slack's auth, discovery,
 * materialization and sync to the `'slack.com'` source.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contribute(ConnectorSpec.Connector, [
      {
        id: 'slack',
        source: SLACK_SOURCE,
        label: 'Slack',
        oauth: {
          provider: OAuthProvider.SLACK,
          scopes: SLACK_SCOPES,
        },
        sync: {
          operation: SlackOperation.SyncSlackChannel,
          getTargets: SlackOperation.GetSlackChannels,
          materializeTarget: SlackOperation.MaterializeSlackTarget,
        },
        onTokenCreated,
        testConnection,
      },
    ]);
  }),
);
