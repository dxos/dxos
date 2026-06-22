//
// Copyright 2026 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database, Obj } from '@dxos/echo';

import { SyncDatabaseMissingError } from '../errors';
import { TrelloApi } from '../services';
import { TrelloOperation } from '../types';

/**
 * Discovery only — list Trello boards reachable from the connection's token
 * and return one descriptor per board. Read-only: NO local Kanbans are
 * created here. Local Kanbans are materialized eagerly when a binding is
 * created (see `materializeTarget`).
 */
const handler: Operation.WithHandler<typeof TrelloOperation.GetTrelloBoards> = TrelloOperation.GetTrelloBoards.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ connection }) {
      // TODO(wittjosiah): the operation should just depend on `Database.Service` and
      //   have it provided by the OperationInvoker — composer's invoker is wired
      //   without a `databaseResolver`, so we derive the db from the input ref's
      //   target and provide `Database.layer(db)` ourselves.
      const target = connection.target;
      const db = target ? Obj.getDatabase(target) : undefined;
      if (!db) {
        return yield* Effect.fail(new SyncDatabaseMissingError());
      }

      return yield* Effect.gen(function* () {
        const remoteBoards = yield* TrelloApi.fetchBoards();
        const targets = remoteBoards.map((board) => ({
          id: board.id,
          name: board.name,
          description: board.shortUrl,
        }));
        return { targets };
      }).pipe(
        Effect.provide(Database.layer(db)),
        Effect.provide(TrelloApi.TrelloCredentials.fromConnection(connection)),
      );
    }, Effect.provide(FetchHttpClient.layer)),
  ),
);

export default handler;
