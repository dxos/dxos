//
// Copyright 2026 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as Effect from 'effect/Effect';

import { Database, Obj, Ref } from '@dxos/echo';
import { Operation } from '@dxos/operation';

import { credentialsFromAccessToken, fetchBoards } from '../services/trello-api';
import { findOrCreateKanbanForBoard } from '../sync/find-or-create-kanban';
import { GetTrelloBoards } from './definitions';

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
        const integrationObj = yield* Database.load(integration);
        const accessToken = yield* Database.load(integrationObj.accessToken);
        const creds = credentialsFromAccessToken(accessToken);

        const remoteBoards = yield* fetchBoards(creds);

        const targets = yield* Effect.forEach(
          remoteBoards,
          Effect.fnUntraced(function* (board) {
            const kanban = yield* findOrCreateKanbanForBoard(board);
            return {
              id: board.id,
              name: board.name,
              description: board.shortUrl,
              object: Ref.make(kanban),
            };
          }),
          { concurrency: 1 },
        );

        return { targets };
      }).pipe(Effect.provide(Database.layer(db)));
    }, Effect.provide(FetchHttpClient.layer)),
  ),
);

export default handler;
