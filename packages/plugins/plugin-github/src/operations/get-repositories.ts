//
// Copyright 2026 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database, Obj } from '@dxos/echo';

import { IntegrationDatabaseMissingError } from '../errors';
import { GitHubApi } from '../services';
import { GetGitHubRepositories } from './definitions';

/**
 * Discovery only — list GitHub repositories reachable from the integration's
 * token. Read-only: NO local Projects are created here. Materialization
 * happens lazily in `SyncGitHubRepositories` on first sync of a target.
 *
 * Output is sorted by `full_name` (case-insensitive) so the picker is stable
 * regardless of GitHub's response order.
 */
const handler: Operation.WithHandler<typeof GetGitHubRepositories> = GetGitHubRepositories.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ integration }) {
      // TODO(burdon): Mirror the Trello pattern — derive the db from the input ref's
      //   target until the OperationInvoker has a `databaseResolver` and the operation
      //   can declare `services: [Database.Service]` directly.
      const target = integration.target;
      const db = target ? Obj.getDatabase(target) : undefined;
      if (!db) {
        return yield* Effect.fail(new IntegrationDatabaseMissingError());
      }

      return yield* Effect.gen(function* () {
        const remoteRepos = yield* GitHubApi.fetchUserRepos();
        const sorted = [...remoteRepos].sort((a, b) =>
          a.full_name.toLowerCase().localeCompare(b.full_name.toLowerCase()),
        );
        const targets = sorted.map((repo) => ({
          id: String(repo.id),
          name: repo.full_name,
          description: repo.description ?? undefined,
        }));
        return { targets };
      }).pipe(
        Effect.provide(Database.layer(db)),
        Effect.provide(GitHubApi.GitHubCredentials.fromIntegration(integration)),
      );
    }, Effect.provide(FetchHttpClient.layer)),
  ),
);

export default handler;
