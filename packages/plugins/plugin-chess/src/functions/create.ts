//
// Copyright 2025 DXOS.org
//

import { Effect, Schema } from 'effect';

import { defineFunction } from '@dxos/functions';

import { Chess } from '../types';

// TODO(burdon): Reconcile with intents.
// TODO(burdon): Evolve into generic tool. How is the current space determined?
export default defineFunction({
  name: 'dxos.org/function/chess/create',
  description: 'Creates a new chess game.',
  inputSchema: Schema.Void,
  outputSchema: Chess.Game,
  handler: Effect.fn(function* (context) {
    console.log(context.context);
    return Chess.makeGame();
  }),
});
