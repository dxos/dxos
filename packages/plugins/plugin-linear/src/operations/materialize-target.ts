//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database, Filter, Obj, Query, Ref } from '@dxos/echo';
import { Project } from '@dxos/types';

import { LINEAR_SOURCE } from '../constants';
import { LinearOperation } from '../types';

const fkFor = (id: string) => ({ source: LINEAR_SOURCE, id });

/**
 * Find-or-create the empty local root Project for a Linear team so an
 * external-sync `Cursor` can be created eagerly. The team's root is a
 * {@link Project} carrying the team's `LINEAR_SOURCE` foreign key; the team's
 * Linear projects and issues are pulled under it on sync. Idempotent: queried
 * by foreign key, so repeated calls return the existing root.
 */
const handler: Operation.WithHandler<typeof LinearOperation.MaterializeLinearTarget> =
  LinearOperation.MaterializeLinearTarget.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ connection, remoteTarget }) {
        if (!remoteTarget) {
          return yield* Effect.dieMessage('Linear is a multi-target connector; remoteTarget is required.');
        }
        // TODO(wittjosiah): the operation should just depend on `Database.Service` and
        //   have it provided by the OperationInvoker — composer's invoker is wired
        //   without a `databaseResolver`, so we derive the db from the connection ref's
        //   target and provide `Database.layer(db)` ourselves.
        const db = connection.target ? Obj.getDatabase(connection.target) : undefined;
        if (!db) {
          return yield* Effect.dieMessage('No database for connection ref.');
        }
        const teamId = remoteTarget.id;

        return yield* Effect.gen(function* () {
          const existing = yield* Database.query(Query.select(Filter.foreignKeys(Project.Project, [fkFor(teamId)])))
            .run;
          if (existing.length > 0) {
            return { target: Ref.make(existing[0]) };
          }

          const created = yield* Database.add(
            Obj.make(Project.Project, {
              [Obj.Meta]: { keys: [fkFor(teamId)] },
              name: remoteTarget.name,
            }),
          );
          return { target: Ref.make(created) };
        }).pipe(Effect.provide(Database.layer(db)));
      }),
    ),
  );

export default handler;
