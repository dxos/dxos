//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database } from '@dxos/echo';
import { Operation } from '@dxos/operation';

import { Chess } from '../types';

import { Create } from './definitions';

export default Create.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ name, pgn, fen }) {
      return yield* Database.add(Chess.make({ name, pgn, fen }));
    }),
  ),
);
