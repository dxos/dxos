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

import { GitHubOperation } from '#types';

import { GITHUB_PROVIDER_ID, GITHUB_SOURCE } from '../constants.ts';
import { GitHubApi } from '../services/index.ts';

/**
 * Service-specific token-created hook for GitHub.
 *
 * Calls GitHub's `/user` to populate `accessToken.account` with the
 * authenticated user's login (falling back to email). Failures are elevated
 * with {@link Effect.orDie}; plugin-connector logs defects from the runner
 * and continues so a failed `/user` cannot block the Connection already
 * created.
 */
const onTokenCreated: ConnectorSpec.OnTokenCreated = ({ accessToken }) =>
  Effect.gen(function* () {
    if (accessToken.account) {
      return;
    }
    const token = yield* Credential.getApiKeyValue({ accessTokenId: accessToken.id });
    const user = yield* GitHubApi.fetchUser().pipe(
      Effect.provide(Layer.succeed(GitHubApi.GitHubCredentials, { token })),
    );
    Obj.update(accessToken, (accessToken) => {
      accessToken.account = user.login ?? user.email;
    });
  }).pipe(Effect.orDie);

/**
 * GitHub `testConnection`: `GET /user` with the stored token. A rejected token
 * (401/403 on a revoked grant) or transport failure surfaces as a user-facing
 * error so the connection UI can offer to reauthenticate.
 */
const testConnection: ConnectorSpec.TestConnection = ({ accessToken }) =>
  Effect.flatMap(Credential.getApiKeyValue({ accessTokenId: accessToken.id }), (token) =>
    GitHubApi.fetchUser().pipe(Effect.provide(Layer.succeed(GitHubApi.GitHubCredentials, { token }))),
  ).pipe(
    Effect.asVoid,
    Effect.mapError(
      () => new ConnectionTestError({ message: 'GitHub rejected the credential. Reauthenticate to continue syncing.' }),
    ),
  );

export const Connector = Capability.makeModule(
  'GitHubConnector',
  { provides: [ConnectorSpec.Connector], activatesOn: ConnectorEvents.Start },
  Effect.fnUntraced(function* () {
    return Capability.contribute(ConnectorSpec.Connector, [
      {
        id: GITHUB_PROVIDER_ID,
        source: GITHUB_SOURCE,
        label: 'GitHub',
        oauth: {
          provider: OAuthProvider.GITHUB,
          scopes: [],
        },
        sync: {
          operation: GitHubOperation.SyncGitHubRepositories,
          getTargets: GitHubOperation.GetGitHubRepositories,
          materializeTarget: GitHubOperation.MaterializeGitHubTarget,
          optionsSchema: GitHubOperation.SyncOptions,
        },
        onTokenCreated,
        testConnection,
      },
    ]);
  }),
);
