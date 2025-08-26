//
// Copyright 2025 DXOS.org
//

import { Effect, Schema } from 'effect';

import { DatabaseService, defineFunction } from '@dxos/functions';

import { Chess } from '../types';

export default defineFunction({
  name: 'dxos.org/function/chess/create',
  description: 'Creates a new chess game.',
  inputSchema: Schema.Void,
  outputSchema: Chess.Game,
  handler: Effect.fn(function* () {
    return yield* DatabaseService.add(Chess.makeGame());
  }),
});
