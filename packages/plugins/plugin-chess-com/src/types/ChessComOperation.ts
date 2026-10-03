//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Operation from '@dxos/compute/Operation';
import { Database, DXN, Ref } from '@dxos/echo';

import * as ChessComAccount from './ChessComAccount.ts';

/** Removes all synced games and chess state from the account feed. */
export const ClearSyncedGames = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.chessCom.clearSyncedGames'),
    name: 'Clear Synced Games',
    description: 'Remove all synced games from the Chess.com account feed.',
    icon: 'ph--trash--regular',
  },
  services: [Database.Service],
  input: Schema.Struct({
    account: Ref.Ref(ChessComAccount.Account),
  }),
  output: Schema.Struct({
    removed: Schema.Number,
  }),
}).pipe(Operation.visible);

/** Fetches archived games from chess.com and appends new Game objects to the account feed. */
export const SyncGames = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.chessCom.syncGames'),
    name: 'Sync Games',
    description: 'Sync archived Chess.com games into the account feed.',
    icon: 'ph--arrows-clockwise--regular',
  },
  services: [Database.Service],
  input: Schema.Struct({
    account: Ref.Ref(ChessComAccount.Account),
  }),
  output: Schema.Struct({
    appended: Schema.Number,
  }),
}).pipe(Operation.visible);
