//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { Capability } from '@dxos/app-framework';
import { Database, Filter, Obj, Query } from '@dxos/echo';
import { Connector, type MaterializeTarget, type OnTokenCreated } from '@dxos/plugin-connector';
import { OAuthProvider } from '@dxos/protocols';
import { Project } from '@dxos/types';

import { GITHUB_PROVIDER_ID, GITHUB_SOURCE } from '../constants';
import { GitHubApi } from '../services';
import { GitHubOperation } from '../types';

const fkFor = (id: string) => ({ source: GITHUB_SOURCE, id });

/**
 * Service-specific token-created hook for GitHub.
 *
 * Calls GitHub's `/user` to populate `accessToken.account` with the
 * authenticated user's login (falling back to email). Failures are elevated
 * with {@link Effect.orDie}; plugin-connector logs defects from the runner
 * and continues so a failed `/user` cannot block the Connection already
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
 * Find-or-create the empty local root Project for a GitHub repo so a
 * {@link SyncBinding} relation can be created eagerly. Idempotent: keyed by the
 * repo's GitHub foreign id (`remoteTarget.id`), it returns the existing Project
 * when one already carries that key. The repo's data is filled in lazily by the
 * sync operation; here we only stamp the foreign key + a display name.
 */
const materializeTarget: MaterializeTarget = ({ remoteTarget, db }) =>
  Effect.gen(function* () {
    if (!remoteTarget) {
      return yield* Effect.dieMessage('GitHub materializeTarget requires a remoteTarget (repo descriptor).');
    }

    const existing = yield* Database.query(
      Query.select(Filter.foreignKeys(Project.Project, [fkFor(remoteTarget.id)])),
    ).run;
    if (existing.length > 0) {
      return existing[0];
    }

    const created = Obj.make(Project.Project, {
      [Obj.Meta]: { keys: [fkFor(remoteTarget.id)] },
      name: remoteTarget.name,
    });
    return yield* Database.add(created);
  }).pipe(Effect.provide(Database.layer(db)));

/**
 * Contributes a single `Connector` entry that wires GitHub's two operations,
 * its target materializer, and the token-created hook to the `'github.com'`
 * source. plugin-connector routes by `connectorId`.
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
    return Capability.contributes(Connector, [
      {
        id: GITHUB_PROVIDER_ID,
        source: GITHUB_SOURCE,
        label: 'GitHub',
        oauth: {
          provider: OAuthProvider.GITHUB,
          scopes: [],
        },
        getSyncTargets: GitHubOperation.GetGitHubRepositories,
        materializeTarget,
        sync: GitHubOperation.SyncGitHubRepositories,
        optionsSchema: GitHubOperation.SyncOptions,
        onTokenCreated,
      },
    ]);
  }),
);
