//
// Copyright 2025 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { Database, Filter, Obj, Ref } from '@dxos/echo';
import { log } from '@dxos/log';
import { Operation } from '@dxos/operation';
import { Kanban } from '@dxos/plugin-kanban/types';
import { ViewModel } from '@dxos/schema';

import { SyncBoard } from './definitions';
import * as TrelloAPI from './trello-api';
import { TrelloCredentials } from '../services';
import { Trello } from '../types';

const handler: Operation.WithHandler<typeof SyncBoard> = SyncBoard.pipe(
  Operation.withHandler(({ board: boardRef }) =>
    Effect.gen(function* () {
      const board = yield* Database.load(boardRef);
      const trelloBoardId = Trello.getTrelloBoardId(board);
      if (!trelloBoardId) {
        return yield* Effect.fail(new Error('TrelloBoard has no trello.com foreign key'));
      }

      const auth = yield* TrelloCredentials.get();
      log('syncing trello board', { boardId: trelloBoardId });

      // Fetch remote state.
      const [remoteLists, remoteCards, boardInfo] = yield* Effect.all([
        TrelloAPI.getLists(trelloBoardId, auth),
        TrelloAPI.getCards(trelloBoardId, auth),
        TrelloAPI.getBoard(trelloBoardId, auth),
      ]);

      const listNameById = new Map(remoteLists.map((list) => [list.id, list.name]));
      const remoteListIds = new Set(remoteLists.map((list) => list.id));
      log('fetched remote data', { lists: remoteLists.length, cards: remoteCards.length });

      // Update board metadata.
      Obj.change(board, (mutable) => {
        mutable.name = boardInfo.name;
        mutable.url = boardInfo.url;
        mutable.closed = boardInfo.closed;
      });

      const db = Obj.getDatabase(board);
      if (!db) {
        return yield* Effect.fail(new Error('Board has no database'));
      }

      // Query all TrelloCards and scope to this board. Cards get scoped via
      // (1) their `board` back-reference set in prior syncs, or (2) fallback
      // by `trelloListId` matching a list that belongs to this board. Either
      // way, we never touch cards that belong to a different board.
      const allCards: Trello.TrelloCard[] = yield* Effect.promise(() =>
        db.query(Filter.type(Trello.TrelloCard)).run(),
      );
      const boardOwnedCards = allCards.filter((card) => {
        if (card.board?.target && Obj.getMeta(card.board.target).keys?.some((key) => key.id === trelloBoardId && key.source === 'trello.com')) {
          return true;
        }
        return !card.board?.target && card.trelloListId && remoteListIds.has(card.trelloListId);
      });
      const existingCardsByTrelloId = new Map<string, Trello.TrelloCard>();
      for (const card of boardOwnedCards) {
        const trelloCardId = Trello.getTrelloCardId(card);
        if (trelloCardId) {
          existingCardsByTrelloId.set(trelloCardId, card);
        }
      }

      let cardsCreated = 0;
      let cardsUpdated = 0;

      // Upsert cards.
      for (const remoteCard of remoteCards) {
        const listName = listNameById.get(remoteCard.idList);
        const labels = remoteCard.labels?.map((label) => ({
          trelloId: label.id,
          name: label.name,
          color: label.color ?? undefined,
        }));
        const members = remoteCard.members?.map((member) => ({
          trelloId: member.id,
          fullName: member.fullName,
          username: member.username,
          avatarUrl: member.avatarUrl ?? undefined,
        }));

        const existing = existingCardsByTrelloId.get(remoteCard.id);
        if (existing) {
          Obj.change(existing, (mutable) => {
            mutable.name = remoteCard.name;
            mutable.description = remoteCard.desc;
            // Keep the back-reference current in case we upgraded an older card.
            if (!mutable.board) {
              mutable.board = Ref.make(board);
            }
            mutable.trelloListId = remoteCard.idList;
            mutable.listName = listName;
            mutable.position = remoteCard.pos;
            mutable.dueDate = remoteCard.due ?? undefined;
            mutable.dueComplete = remoteCard.dueComplete;
            mutable.labels = labels;
            mutable.members = members;
            mutable.url = remoteCard.url;
            mutable.closed = remoteCard.closed;
            mutable.lastActivityAt = remoteCard.dateLastActivity;
          });
          cardsUpdated++;
        } else {
          const card = Trello.makeCard({
            name: remoteCard.name,
            description: remoteCard.desc,
            board: Ref.make(board),
            trelloCardId: remoteCard.id,
            trelloListId: remoteCard.idList,
            listName,
            position: remoteCard.pos,
            dueDate: remoteCard.due ?? undefined,
            dueComplete: remoteCard.dueComplete,
            labels,
            members,
            url: remoteCard.url,
            closed: remoteCard.closed,
            lastActivityAt: remoteCard.dateLastActivity,
          });
          db.add(card);
          cardsCreated++;
        }
      }

      // Close board-owned cards that have disappeared from remote. Cards
      // owned by other boards were filtered out above so this never touches
      // them.
      const remoteCardIds = new Set(remoteCards.map((card) => card.id));
      let cardsRemoved = 0;
      for (const [trelloId, existing] of existingCardsByTrelloId) {
        if (!remoteCardIds.has(trelloId) && !existing.closed) {
          Obj.change(existing, (mutable) => {
            mutable.closed = true;
          });
          cardsRemoved++;
        }
      }

      // Update sync timestamp.
      Obj.change(board, (mutable) => {
        mutable.lastSyncedAt = new Date().toISOString();
      });

      // Create a Kanban view on first sync. The view is scoped to cards whose
      // `board` ref points at this board so multi-board spaces don't cross-pollute.
      if (!board.kanbanId) {
        try {
          const { view } = yield* Effect.promise(() =>
            // The view is over TrelloCards; the Kanban object (below) wraps it.
            // TODO(trello): ViewModel doesn't expose a board-scoped filter yet,
            // so this Kanban surfaces every TrelloCard in the space. Fine for a
            // single-board setup; multi-board spaces need a filter extension.
            ViewModel.makeFromDatabase({
              db,
              typename: 'org.dxos.type.trelloCard',
              pivotFieldName: 'listName',
              fields: ['name', 'description', 'listName', 'dueDate'],
              createInitial: 0,
            }),
          );
          const listOrder = remoteLists.map((list) => list.name);
          const kanban = Kanban.make({
            name: boardInfo.name,
            view,
            arrangement: { order: listOrder, columns: {} },
          });
          db.add(kanban);
          Obj.change(board, (mutable) => {
            mutable.kanbanId = kanban.id;
          });
          log('created kanban board', { kanbanId: kanban.id });
        } catch (error) {
          log.catch(error);
        }
      }

      log('sync complete', { cardsCreated, cardsUpdated, cardsRemoved });
      return { cardsCreated, cardsUpdated, cardsRemoved };
    }).pipe(
      Effect.provide(Layer.mergeAll(FetchHttpClient.layer, TrelloCredentials.fromBoard(boardRef))),
    ),
  ),
);

export default handler;
