//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { SyncDatabaseMissingError } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { Database, Obj, Ref } from '@dxos/echo';

import { TrelloOperation } from '../types';
import { findKanbanForBoard, makeEmptyKanbanForBoard } from './sync';

/**
 * Eagerly materializes an empty local Kanban for a remote Trello board so an
 * external-sync `Cursor` can be created against it. Find-or-create keyed on the
 * board's foreign key, so re-running for the same board returns the existing
 * Kanban without duplicating it. The Kanban is left empty here — cards are
 * reconciled on the first `SyncTrelloBoard` run.
 */
const handler: Operation.WithHandler<typeof TrelloOperation.MaterializeTrelloTarget> =
  TrelloOperation.MaterializeTrelloTarget.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ connection, remoteTarget }) {
        if (!remoteTarget) {
          // Trello is a multi-target connector; a board selection is always present.
          return yield* Effect.fail(new Error('Trello materializeTarget requires a remote board selection.'));
        }
        // TODO(wittjosiah): the operation should just depend on `Database.Service` and
        //   have it provided by the OperationInvoker — composer's invoker is wired
        //   without a `databaseResolver`, so we derive the db from the connection ref's
        //   target and provide `Database.layer(db)` ourselves.
        const db = connection.target ? Obj.getDatabase(connection.target) : undefined;
        if (!db) {
          return yield* Effect.fail(new SyncDatabaseMissingError());
        }

        return yield* Effect.gen(function* () {
          const existing = yield* findKanbanForBoard(remoteTarget.id);
          if (existing) {
            return { target: Ref.make(existing) };
          }
          const created = yield* Database.add(makeEmptyKanbanForBoard(remoteTarget.id, remoteTarget.name));
          return { target: Ref.make(created) };
        }).pipe(Effect.provide(Database.layer(db)));
      }),
    ),
  );

export default handler;
