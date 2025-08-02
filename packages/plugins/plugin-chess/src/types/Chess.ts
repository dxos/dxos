//
// Copyright 2024 DXOS.org
//

import { Schema } from 'effect';

import { Type } from '@dxos/echo';
import { LabelAnnotation } from '@dxos/echo-schema';

// export const Move = Schema.mutable(
//   Schema.partial(
//     Schema.Struct({
//       source: Schema.String,
//       target: Schema.String,
//       piece: Schema.String,
//     }),
//   ),
// );

export const Game = Schema.Struct({
  name: Schema.optional(Schema.String),
  playerWhite: Schema.String,
  playerBlack: Schema.String,
  moves: Schema.mutable(Schema.Array(Schema.String)),
  // TODO(wittjosiah): Remove. Redundant with moves.
  pgn: Schema.String,
  fen: Schema.String,
}).pipe(
  Schema.partial,
  Type.Obj({
    typename: 'dxos.org/type/Chess',
    version: '0.1.0',
  }),
  LabelAnnotation.set(['name']),
);

export interface Game extends Schema.Schema.Type<typeof Game> {}
