//
// Copyright 2026 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Operation } from '@dxos/compute';
import { Annotation, Database, Filter, Obj, Query, Ref } from '@dxos/echo';
import { Connection } from '@dxos/plugin-connector';

import { GITHUB_PROVIDER_ID } from '../constants';
import { GitHubApi } from '../services';
import { GitHubOperation, PullRequestAnnotation } from '../types';

/**
 * Fetch the unified diff for the pull request backing a Task.
 *
 * The Task carries the {@link PullRequestAnnotation} (set during sync), which
 * supplies the owner/repo/number. The token is sourced from the space's GitHub
 * {@link Connection} — matched by `connectorId`, falling back to the first
 * connection when the id is absent (legacy rows). The diff is returned as text;
 * the caller holds it in memory.
 */
const handler: Operation.WithHandler<typeof GitHubOperation.GetGitHubPullRequestDiff> =
  GitHubOperation.GetGitHubPullRequestDiff.pipe(
    Operation.withHandler(
      Effect.fn(function* ({ task }) {
        const taskObj = task.target;
        if (!taskObj) {
          return yield* Effect.dieMessage('Task ref must be preloaded by caller.');
        }

        const pullRequest = Option.getOrUndefined(Annotation.get(taskObj, PullRequestAnnotation));
        if (!pullRequest) {
          return yield* Effect.dieMessage('Task is not backed by a pull request.');
        }

        // TODO(wittjosiah): Mirror the other GitHub operations — derive the db from the input
        //   ref's target until the OperationInvoker provides `Database.Service` directly.
        const db = Obj.getDatabase(taskObj);
        if (!db) {
          return yield* Effect.dieMessage('No database for task ref.');
        }

        return yield* Effect.gen(function* () {
          const connections = yield* Database.query(Query.select(Filter.type(Connection.Connection))).run;
          const connection =
            connections.find((entry) => entry.connectorId === GITHUB_PROVIDER_ID) ?? connections[0];
          if (!connection) {
            return yield* Effect.dieMessage('No GitHub connection found in this space.');
          }

          const diff = yield* GitHubApi.fetchPullRequestDiff(
            pullRequest.owner,
            pullRequest.repo,
            pullRequest.number,
          ).pipe(Effect.provide(GitHubApi.GitHubCredentials.fromConnection(Ref.make(connection))));

          return { diff };
        }).pipe(Effect.provide(Database.layer(db)));
      }, Effect.provide(FetchHttpClient.layer)),
    ),
  );

export default handler;
