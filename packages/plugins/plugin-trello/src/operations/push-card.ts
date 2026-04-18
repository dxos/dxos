//
// Copyright 2025 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { Database } from '@dxos/echo';
import { log } from '@dxos/log';
import { Operation } from '@dxos/operation';

import { PushCard } from './definitions';
import * as TrelloAPI from './trello-api';
import { TrelloCredentials } from '../services';
import { Trello } from '../types';

const handler: Operation.WithHandler<typeof PushCard> = PushCard.pipe(
  Operation.withHandler(({ board: boardRef, card: cardRef }) =>
    Effect.gen(function* () {
      const card = yield* Database.load(cardRef);
      const trelloCardId = Trello.getTrelloCardId(card as Trello.TrelloCard);
      const { name, description, trelloListId } = card as Trello.TrelloCard;

      if (!trelloCardId) {
        return yield* Effect.fail(new Error('Card has no Trello foreign key'));
      }

      const auth = yield* TrelloCredentials.get();

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
    }).pipe(
      Effect.provide(
        Layer.mergeAll(FetchHttpClient.layer, TrelloCredentials.fromBoard(boardRef)),
      ),
    ),
  ),
);

export default handler;
