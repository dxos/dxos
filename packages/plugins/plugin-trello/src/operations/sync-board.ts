//
// Copyright 2025 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { Database, Filter, Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import { Operation } from '@dxos/operation';

import { SyncBoard } from './definitions';
import * as TrelloAPI from './trello-api';
import { TrelloCredentials } from '../services';
import { Trello } from '../types';

const handler: Operation.WithHandler<typeof SyncBoard> = SyncBoard.pipe(
  Operation.withHandler(({ board: boardRef }) =>
    Effect.gen(function* () {
      const board = yield* Database.load(boardRef);
      const trelloBoardId = Trello.getTrelloBoardId(board as Trello.TrelloBoard);

      if (!trelloBoardId) {
        return yield* Effect.fail(new Error('Board has no Trello foreign key'));
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
      log('fetched remote data', { lists: remoteLists.length, cards: remoteCards.length });

      // Update board metadata.
      Obj.change(board as Trello.TrelloBoard, (mutable) => {
        mutable.name = boardInfo.name;
        mutable.url = boardInfo.url;
        mutable.closed = boardInfo.closed;
      });

      // Query all existing TrelloCard objects and filter to this board's cards by foreignKey.
      const db = Obj.getDatabase(board);
      if (!db) {
        return yield* Effect.fail(new Error('Board has no database'));
      }
      const allCards: Trello.TrelloCard[] = yield* Effect.promise(() =>
        db.query(Filter.type(Trello.TrelloCard)).run(),
      );

      // Build index of existing cards by their Trello foreign key.
      const existingCardsByTrelloId = new Map<string, Trello.TrelloCard>();
      for (const card of allCards) {
        const cardTrelloId = Trello.getTrelloCardId(card);
        if (cardTrelloId) {
          existingCardsByTrelloId.set(cardTrelloId, card);
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
            trelloCardId: remoteCard.id,
            name: remoteCard.name,
            description: remoteCard.desc,
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

      log('sync complete', { cardsCreated, cardsUpdated, cardsRemoved });
      return { cardsCreated, cardsUpdated, cardsRemoved };
    }).pipe(
      Effect.provide(
        Layer.mergeAll(FetchHttpClient.layer, TrelloCredentials.fromBoard(boardRef)),
      ),
    ),
  ),
);

export default handler;
