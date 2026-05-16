//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { Capability } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';
import { IntegrationProvider as IntegrationProviderCapability, type OnTokenCreated } from '@dxos/plugin-integration';
import { OAuthProvider } from '@dxos/protocols';

import { GITHUB_PROVIDER_ID, GITHUB_SOURCE } from '../constants';
import { GitHubApi } from '../services';
import { GitHubOperation } from '../types';

/**
 * Service-specific token-created hook for GitHub.
 *
 * Calls GitHub's `/user` to populate `accessToken.account` with the
 * authenticated user's login (falling back to email). Failures are elevated
 * with {@link Effect.orDie}; plugin-integration logs defects from the runner
 * and continues so a failed `/user` cannot block the Integration already
 * created.
 */
const onTokenCreated: OnTokenCreated = ({ accessToken }) =>
  Effect.gen(function* () {
    if (accessToken.account) {
      return;
    }
    const user = yield* GitHubApi.fetchUser().pipe(
      Effect.provide(Layer.succeed(GitHubApi.GitHubCredentials, { token: accessToken.token })),
    );
    Obj.update(accessToken, (accessToken) => {
      accessToken.account = user.login ?? user.email;
    });
  }).pipe(Effect.orDie);

/**
 * Contributes a single `IntegrationProvider` entry that wires GitHub's two
 * operations and the token-created hook to the `'github.com'` source.
 * plugin-integration looks up providers by source string.
 *
 * Sync targets are repositories, not organizations — orgs and their members
 * are auto-pulled as a side effect of syncing any repo they own.
 *
 * `scopes` is intentionally empty: this is a GitHub *App* (not a classic
 * OAuth App), so permissions are declared in the App's settings on github.com
 * and OAuth scope strings are ignored on the user-authorization flow.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributes(IntegrationProviderCapability, [
      {
        id: GITHUB_PROVIDER_ID,
        source: GITHUB_SOURCE,
        label: 'GitHub',
        oauth: {
          provider: OAuthProvider.GITHUB,
          scopes: [],
        },
        getSyncTargets: GitHubOperation.GetGitHubRepositories,
        sync: GitHubOperation.SyncGitHubRepositories,
        optionsSchema: GitHubOperation.SyncOptions,
        onTokenCreated,
      },
    ]);
  }),
);
