//
// Copyright 2025 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as Effect from 'effect/Effect';

import { Database } from '@dxos/echo';
import { log } from '@dxos/log';
import { Operation } from '@dxos/operation';

import { PushCard } from './definitions';
import * as TrelloAPI from './trello-api';
import { Trello } from '../types';

const handler: Operation.WithHandler<typeof PushCard> = PushCard.pipe(
  Operation.withHandler(({ board: boardRef, card: cardRef }) =>
    Effect.gen(function* () {
      const board = yield* Database.load(boardRef);
      const card = yield* Database.load(cardRef);
      const { apiKey, apiToken } = board as Trello.TrelloBoard;
      const { trelloCardId, name, description, trelloListId } = card as Trello.TrelloCard;

      if (!apiKey || !apiToken) {
        return yield* Effect.fail(new Error('Trello API key and token are required'));
      }

      const auth = { apiKey, apiToken };

      log('pushing card to trello', { trelloCardId, name });

      const fields: Record<string, string> = {};
      if (name) {
        fields.name = name;
      }
      if (description !== undefined) {
        fields.desc = description ?? '';
      }
      if (trelloListId) {
        fields.idList = trelloListId;
      }

      yield* TrelloAPI.updateCard(trelloCardId, fields, auth);

      log('card pushed to trello', { trelloCardId });
      return { success: true };
    }).pipe(Effect.provide(FetchHttpClient.layer)),
  ),
);

export default handler;
