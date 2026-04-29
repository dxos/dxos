//
// Copyright 2026 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as Effect from 'effect/Effect';

import { Database, Ref } from '@dxos/echo';
import { Operation } from '@dxos/operation';

import { credentialsFromAccessToken, fetchBoards } from '../services/trello-api';
import { findOrCreateKanbanForBoard } from '../sync/find-or-create-kanban';
import { GetTrelloBoards } from './definitions';

const handler: Operation.WithHandler<typeof GetTrelloBoards> = GetTrelloBoards.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ integration }) {
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
    }, Effect.provide(FetchHttpClient.layer)),
  ),
);

export default handler;
