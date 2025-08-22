//
// Copyright 2025 DXOS.org
//

import { Effect, Schema } from 'effect';

import { DatabaseService, defineFunction } from '@dxos/functions';

import { Chess } from '../types';

// TODO(burdon): Evolve into generic tool. How is the current space determined?
export default defineFunction({
  name: 'dxos.org/function/chess/create',
  description: 'Creates a new chess game.',
  inputSchema: Schema.Void,
  outputSchema: Schema.String.annotations({
    description: 'The ID of the new chess game.',
  }),
  handler: Effect.fn(function* () {
    const object = yield* DatabaseService.add(Chess.makeGame());
    return object.id;
  }),
});
