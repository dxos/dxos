//
// Copyright 2026 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as Effect from 'effect/Effect';

import { Database, Obj } from '@dxos/echo';
import { Operation } from '@dxos/operation';

import { TrelloCredentials, fetchBoards } from '../services/trello-api';
import { GetTrelloBoards } from './definitions';

/**
 * Discovery only — list Trello boards reachable from the integration's token
 * and return one descriptor per board. Read-only: NO local Kanbans are
 * created here. Materialization happens lazily in `SyncTrelloBoard` on first
 * sync of a target.
 */
const handler: Operation.WithHandler<typeof GetTrelloBoards> = GetTrelloBoards.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ integration }) {
      // TODO(wittjosiah): the operation should just depend on `Database.Service` and
      //   have it provided by the OperationInvoker — composer's invoker is wired
      //   without a `databaseResolver`, so we derive the db from the input ref's
      //   target and provide `Database.layer(db)` ourselves.
      const target = integration.target;
      const db = target ? Obj.getDatabase(target) : undefined;
      if (!db) {
        return yield* Effect.fail(new Error('No database for integration ref'));
      }

      return yield* Effect.gen(function* () {
        const remoteBoards = yield* fetchBoards();
        const targets = remoteBoards.map((board) => ({
          id: board.id,
          name: board.name,
          description: board.shortUrl,
        }));
        return { targets };
      }).pipe(Effect.provide(Database.layer(db)), Effect.provide(TrelloCredentials.fromIntegration(integration)));
    }, Effect.provide(FetchHttpClient.layer)),
  ),
);

export default handler;
