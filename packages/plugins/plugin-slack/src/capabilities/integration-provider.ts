//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { Capability } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';
import { IntegrationProvider as IntegrationProviderCapability, type OnTokenCreated } from '@dxos/plugin-integration';
import { OAuthProvider } from '@dxos/protocols';

import { SLACK_SCOPES, SLACK_SOURCE } from '../constants';
import { SlackApi } from '../services';
import { SlackOperation } from '../types';

/**
 * Service-specific token-created hook for Slack.
 *
 * Calls Slack's `auth.test` to populate `accessToken.account` with the
 * authenticated user's display name (falling back to user id) and the team
 * domain. Failures are elevated with {@link Effect.orDie}; plugin-integration
 * logs defects from the runner and continues so a failed `auth.test` cannot
 * block the Integration already created.
 */
const onTokenCreated: OnTokenCreated = ({ accessTokens }) =>
  Effect.gen(function* () {
    const accessToken = accessTokens[0];
    if (!accessToken || accessToken.account) {
      return;
    }
    const result = yield* SlackApi.fetchAuthTest().pipe(
      Effect.provide(Layer.succeed(SlackApi.SlackCredentials, { token: accessToken.token })),
    );
    Obj.update(accessToken, (accessToken) => {
      // Prefer a `<user>@<team>` shape because it reads naturally in the
      // integrations list and stays unique per workspace, but fall back to
      // either side if Slack returned only one.
      if (result.user && result.team) {
        accessToken.account = `${result.user}@${result.team}`;
      } else {
        accessToken.account = result.user ?? result.team ?? result.user_id ?? '';
      }
    });
  }).pipe(Effect.orDie);

/**
 * Contributes a single `IntegrationProvider` entry that wires Slack's two operations
 * and the token-created hook to the `'slack.com'` source.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributes(IntegrationProviderCapability, [
      {
        id: 'slack',
        source: SLACK_SOURCE,
        label: 'Slack',
        oauth: {
          provider: OAuthProvider.SLACK,
          scopes: SLACK_SCOPES,
        },
        getSyncTargets: SlackOperation.GetSlackChannels,
        sync: SlackOperation.SyncSlackChannel,
        onTokenCreated,
      },
    ]);
  }),
);
