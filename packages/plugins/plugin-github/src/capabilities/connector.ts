//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import * as Capability from '@dxos/app-framework/Capability';
import * as Credential from '@dxos/compute/Credential';
import * as Trigger from '@dxos/compute/Trigger';
import { Obj } from '@dxos/echo';
import * as ConnectorError from '@dxos/plugin-connector/ConnectorError';
import * as ConnectorSpec from '@dxos/plugin-connector/ConnectorSpec';
import { OAuthProvider } from '@dxos/protocols';

import { GitHubOperation } from '#types';

import { GITHUB_APP_PROVIDER_ID, GITHUB_MCP_ENDPOINT, GITHUB_PROVIDER_ID, GITHUB_SOURCE } from '../constants.ts';
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
      () =>
        new ConnectorError.ConnectionTestError({
          message: 'GitHub rejected the credential. Reauthenticate to continue syncing.',
        }),
    ),
  );

/** The App installation's account names the connection; an installation token cannot call `/user`. */
const onAppTokenCreated: ConnectorSpec.OnTokenCreated = ({ accessToken }) =>
  Effect.gen(function* () {
    if (accessToken.account) {
      return;
    }
    const token = yield* Credential.getApiKeyValue({ accessTokenId: accessToken.id });
    const account = yield* GitHubApi.fetchInstallationAccount().pipe(
      Effect.provide(Layer.succeed(GitHubApi.GitHubCredentials, { token })),
    );
    if (account) {
      Obj.update(accessToken, (accessToken) => {
        accessToken.account = account;
      });
    }
  }).pipe(Effect.orDie);

/** An uninstalled App, or a token EDGE can no longer mint, fails the installation's repository read. */
const testAppConnection: ConnectorSpec.TestConnection = ({ accessToken }) =>
  Effect.flatMap(GitHubApi.resolveToken(accessToken), (token) =>
    GitHubApi.fetchInstallationAccount().pipe(Effect.provide(Layer.succeed(GitHubApi.GitHubCredentials, { token }))),
  ).pipe(
    Effect.asVoid,
    Effect.mapError(
      () =>
        new ConnectorError.ConnectionTestError({
          message: 'GitHub rejected the App installation. Reinstall the App to continue syncing.',
        }),
    ),
  );

/**
 * Every 3 minutes: a poll of a quiet repository is one conditional request GitHub answers `304`
 * without charging the rate limit, so polling this often costs at most 20 requests an hour per binding.
 */
const GITHUB_SYNC_CRON = '*/3 * * * *';

const sync: ConnectorSpec.ConnectorEntry['sync'] = {
  operation: GitHubOperation.SyncGitHubRepositories,
  getTargets: GitHubOperation.GetGitHubRepositories,
  materializeTarget: GitHubOperation.MaterializeGitHubTarget,
  optionsSchema: GitHubOperation.SyncOptions,
  // The interval belongs to this trigger; nothing on the binding mirrors it.
  trigger: Trigger.specTimer(GITHUB_SYNC_CRON),
  // Polls run on EDGE, where the sync operation is registered, so they continue with no client open.
  remote: true,
};

/**
 * Contributes GitHub's two `ConnectorSpec.Connector` entries: one acting as the user who connects,
 * one as DXOS's GitHub App installed on an account or org. Both wire the same sync operations and
 * target materializer to the `'github.com'` source; plugin-connector routes by `connectorId`.
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
    return Capability.contribute(ConnectorSpec.Connector, [
      {
        id: GITHUB_PROVIDER_ID,
        source: GITHUB_SOURCE,
        label: 'GitHub',
        kind: 'user',
        mcp: () => GITHUB_MCP_ENDPOINT,
        oauth: {
          provider: OAuthProvider.GITHUB,
          scopes: [],
        },
        sync,
        onTokenCreated,
        testConnection,
      },
      {
        id: GITHUB_APP_PROVIDER_ID,
        source: GITHUB_SOURCE,
        label: 'GitHub App',
        kind: 'app',
        mcp: () => GITHUB_MCP_ENDPOINT,
        oauth: {
          provider: OAuthProvider.GITHUB,
          scopes: [],
        },
        sync,
        onTokenCreated: onAppTokenCreated,
        testConnection: testAppConnection,
      },
    ]);
  }),
);
