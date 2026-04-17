//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Database, Ref } from '@dxos/echo';
import { Operation } from '@dxos/operation';

import { Trello } from '../types';

/** Sync a Trello board's lists and cards into ECHO. */
export const SyncBoard = Operation.make({
  meta: {
    key: 'dxos.org/function/trello/sync-board',
    name: 'Sync Trello Board',
    description: 'Fetch lists and cards from a Trello board and sync them into ECHO objects.',
  },
  input: Schema.Struct({
    board: Ref.Ref(Trello.TrelloBoard).annotations({
      description: 'Reference to the TrelloBoard object to sync.',
    }),
  }),
  output: Schema.Struct({
    cardsCreated: Schema.Number,
    cardsUpdated: Schema.Number,
    cardsRemoved: Schema.Number,
  }),
  types: [Trello.TrelloBoard, Trello.TrelloCard],
  services: [Database.Service],
});

/** Push local card changes back to Trello. */
export const PushCard = Operation.make({
  meta: {
    key: 'dxos.org/function/trello/push-card',
    name: 'Push Card to Trello',
    description: 'Push local changes to a TrelloCard back to the Trello API.',
  },
  input: Schema.Struct({
    board: Ref.Ref(Trello.TrelloBoard).annotations({
      description: 'Reference to the TrelloBoard for API credentials.',
    }),
    card: Ref.Ref(Trello.TrelloCard).annotations({
      description: 'Reference to the TrelloCard to push.',
    }),
  }),
  output: Schema.Struct({
    success: Schema.Boolean,
  }),
  types: [Trello.TrelloBoard, Trello.TrelloCard],
  services: [Database.Service],
});
