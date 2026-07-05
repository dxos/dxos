//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Operation } from '@dxos/compute';
import { Database, DXN, Ref } from '@dxos/echo';

import { meta } from '#meta';

import * as ChessComAccount from './ChessComAccount';

const makeKey = (name: string) => DXN.make(`${meta.profile.key}.operation.${name}`);

/** Fetches archived games from chess.com and appends new Game objects to the account feed. */
export const SyncGames = Operation.make({
  meta: {
    key: makeKey('syncGames'),
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
