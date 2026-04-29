//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database, Filter, Obj, Query } from '@dxos/echo';
import { Kanban } from '@dxos/plugin-kanban/types';

import { TRELLO_PIVOT_FIELD, TRELLO_SOURCE } from '../constants';
import { type TrelloBoard } from '../services/trello-api';

/**
 * Finds an existing items-variant Kanban whose foreign key matches the given remote board,
 * or creates a fresh one (with the foreign key set, `pivotField: 'listName'`, and an empty
 * `items` array). Idempotent: re-running on the same `(space, board)` returns the same Kanban.
 */
export const findOrCreateKanbanForBoard: (
  board: TrelloBoard,
) => Effect.Effect<Kanban.Kanban, never, Database.Service> = Effect.fn('findOrCreateKanbanForBoard')(function* (
  board,
) {
  const existing = yield* Database.runQuery(
    Query.select(Filter.foreignKeys(Kanban.Kanban, [{ source: TRELLO_SOURCE, id: board.id }])),
  );
  if (existing.length > 0) {
    return existing[0] as Kanban.Kanban;
  }

  const kanban = Obj.make(Kanban.Kanban, {
    [Obj.Meta]: { keys: [{ source: TRELLO_SOURCE, id: board.id }] },
    name: board.name,
    arrangement: { order: [], columns: {} },
    spec: { kind: 'items' as const, pivotField: TRELLO_PIVOT_FIELD, items: [] },
  });
  return yield* Database.add(kanban);
});
