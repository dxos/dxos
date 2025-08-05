//
// Copyright 2025 DXOS.org
//

import { Effect, Schema } from 'effect';

import { ArtifactId } from '@dxos/assistant';
import { Obj } from '@dxos/echo';
import { DatabaseService, defineFunction } from '@dxos/functions';
import { log } from '@dxos/log';

import { Chess } from '../types';

// TODO(burdon): Common error handling.
// TODO(burdon): Factor out as generic tool to load objects?
export default defineFunction({
  name: 'dxos.org/function/chess/read',
  description: 'Loads the chess object.',
  inputSchema: Schema.Struct({
    id: ArtifactId.annotations({
      description: 'The ID of the chess object.',
    }),
  }),
  outputSchema: Schema.Struct({
    object: Chess.Game,
  }),
  handler: Effect.fn(function* ({ data: { id } }) {
    const object = yield* DatabaseService.resolve(ArtifactId.toDXN(id));
    if (!object || !Obj.instanceOf(Chess.Game, object)) {
      throw new Error('Object not found.');
    }

    log.info('object', { game: object.pgn });
    return { object };
  }),
});
