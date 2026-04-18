//
// Copyright 2025 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as Effect from 'effect/Effect';

import { Database, Filter, Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import { Operation } from '@dxos/operation';
import { Kanban } from '@dxos/plugin-kanban/types';
import { ViewModel } from '@dxos/schema';

import { SyncBoard } from './definitions';
import * as TrelloAPI from './trello-api';
import { Trello } from '../types';

const handler: Operation.WithHandler<typeof SyncBoard> = SyncBoard.pipe(
  Operation.withHandler(({ board: boardRef }) =>
    Effect.gen(function* () {
      const board = yield* Database.load(boardRef);
      const { trelloBoardId, apiKey, apiToken } = board as Trello.TrelloBoard;

      if (!apiKey || !apiToken) {
        return yield* Effect.fail(new Error('Trello API key and token are required'));
      }

      const auth = { apiKey, apiToken };
      log('syncing trello board', { boardId: trelloBoardId });

      // Fetch remote state.
      const [remoteLists, remoteCards, boardInfo] = yield* Effect.all([
        TrelloAPI.getLists(trelloBoardId, auth),
        TrelloAPI.getCards(trelloBoardId, auth),
        TrelloAPI.getBoard(trelloBoardId, auth),
      ]);

      const listNameById = new Map(remoteLists.map((list) => [list.id, list.name]));
      log('fetched remote data', { lists: remoteLists.length, cards: remoteCards.length });

      // Update board metadata.
      Obj.change(board as Trello.TrelloBoard, (mutable) => {
        mutable.name = boardInfo.name;
        mutable.url = boardInfo.url;
        mutable.closed = boardInfo.closed;
      });

      // Query all existing TrelloCard objects and filter to this board's cards.
      const db = Obj.getDatabase(board);
      if (!db) {
        return yield* Effect.fail(new Error('Board has no database'));
      }
      const allCards: Trello.TrelloCard[] = yield* Effect.promise(() =>
        db.query(Filter.type(Trello.TrelloCard)).run(),
      );
      const existingCardsByTrelloId = new Map(
        allCards.map((card) => [card.trelloCardId, card]),
      );

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

      // Mark cards removed from Trello as closed.
      const remoteCardIds = new Set(remoteCards.map((card) => card.id));
      let cardsRemoved = 0;
      for (const [trelloId, existing] of existingCardsByTrelloId) {
        if (!remoteCardIds.has(trelloId)) {
          Obj.change(existing, (mutable) => {
            mutable.closed = true;
          });
          cardsRemoved++;
        }
      }

      // Update sync timestamp.
      Obj.change(board as Trello.TrelloBoard, (mutable) => {
        mutable.lastSyncedAt = new Date().toISOString();
      });

      // Create Kanban view on first sync.
      const typedBoard = board as Trello.TrelloBoard;
      if (!typedBoard.kanbanId) {
        try {
          const { view } = yield* Effect.promise(() =>
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
          Obj.change(typedBoard, (mutable) => {
            mutable.kanbanId = kanban.id;
          });
          log('created kanban board', { kanbanId: kanban.id });
        } catch (error) {
          log.catch(error);
        }
      }

      log('sync complete', { cardsCreated, cardsUpdated, cardsRemoved });
      return { cardsCreated, cardsUpdated, cardsRemoved };
    }).pipe(Effect.provide(FetchHttpClient.layer)),
  ),
);

export default handler;
