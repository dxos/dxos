//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Filter, Obj, Query, Ref } from '@dxos/echo';
import { TaskSet } from '@dxos/types';

import { GitHubOperation } from '#types';

import { GITHUB_SOURCE } from '../constants.ts';

const fkFor = (id: string) => ({ source: GITHUB_SOURCE, id });

/**
 * Find-or-create the empty local root Project for a GitHub repo so a `Cursor`
 * can reference it as its `spec.target`. Idempotent: keyed by the repo's
 * GitHub foreign id (`remoteTarget.id`), it returns the existing Project
 * when one already carries that key. The repo's data is filled in lazily by the
 * sync operation; here we only stamp the foreign key + a display name.
 */
const handler: Operation.WithHandler<typeof GitHubOperation.MaterializeGitHubTarget> =
  GitHubOperation.MaterializeGitHubTarget.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ connection, remoteTarget }) {
        if (!remoteTarget) {
          return yield* Effect.die(new Error('GitHub materializeTarget requires a remoteTarget (repo descriptor).'));
        }
        // TODO(wittjosiah): the operation should just depend on `Database.Service` and
        //   have it provided by the OperationInvoker — composer's invoker is wired
        //   without a `databaseResolver`, so we derive the db from the connection ref's
        //   target and provide `Database.layer(db)` ourselves.
        const db = connection.target ? Obj.getDatabase(connection.target) : undefined;
        if (!db) {
          return yield* Effect.die(new Error('No database for connection ref.'));
        }

        return yield* Effect.gen(function* () {
          const existing = yield* Database.query(
            Query.select(Filter.foreignKeys(TaskSet.TaskSet, [fkFor(remoteTarget.id)])),
          ).run;
          if (existing.length > 0) {
            return { target: Ref.make(existing[0]) };
          }

          const created = yield* Database.add(
            TaskSet.make({
              [Obj.Meta]: { keys: [fkFor(remoteTarget.id)] },
              name: remoteTarget.name,
            }),
          );
          return { target: Ref.make(created) };
        }).pipe(Effect.provide(Database.layer(db)));
      }),
    ),
  );

export default handler;
