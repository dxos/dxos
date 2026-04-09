//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Database, Ref } from '@dxos/echo';
import { Operation } from '@dxos/operation';

import { Chess } from '../types';

export const Create = Operation.make({
  meta: {
    key: 'org.dxos.function.chess.create',
    name: 'Create Chess',
    description: 'Creates a new chess game.',
  },
  input: Schema.Struct({
    name: Schema.optional(
      Schema.String.annotations({
        description: 'Name of the game.',
      }),
    ),
    pgn: Schema.optional(
      Schema.String.annotations({
        description: 'Portable Game Notation.',
      }),
    ),
    fen: Schema.optional(
      Schema.String.annotations({
        description: 'Forsyth-Edwards Notation.',
      }),
    ),
  }),
  output: Chess.Game,
  services: [Database.Service],
});

export const Move = Operation.make({
  meta: {
    key: 'org.dxos.function.chess.move',
    name: 'Move',
    description: 'Makes a move in the given chess game.',
  },
  input: Schema.Struct({
    game: Ref.Ref(Chess.Game).annotations({
      description: 'The ID of the chess object.',
    }),
    move: Schema.String.annotations({
      description: 'The move to make in the chess game.',
      examples: ['e4', 'Bf3'],
    }),
  }),
  output: Schema.Struct({
    pgn: Schema.String.annotations({
      description: 'The PGN of the game after the move was played.',
    }),
  }),
  services: [Database.Service],
});

export const Play = Operation.make({
  meta: {
    key: 'org.dxos.function.chess.play',
    name: 'Play',
    description: 'Uses the chess engine to play the next move.',
  },
  input: Schema.Struct({
    game: Ref.Ref(Chess.Game).annotations({
      description: 'The ID of the chess object.',
    }),
    side: Schema.optional(Schema.Literal('white', 'black', 'any')).annotations({
      description: 'The side to play.',
      defaultValue: 'any',
    }),
  }),
  output: Schema.Struct({
    pgn: Schema.String.annotations({
      description: 'The PGN of the game after the move was played.',
    }),
    move: Schema.optional(Schema.String).annotations({
      description: 'The move that was played.',
    }),
  }),
  services: [Database.Service],
});

export const Print = Operation.make({
  meta: {
    key: 'org.dxos.function.chess.print',
    name: 'Print game',
    description: 'Prints the chess game to ASCII.',
  },
  input: Schema.Struct({
    pgn: Schema.optional(
      Schema.String.annotations({
        description: 'Portable Game Notation.',
      }),
    ),
    fen: Schema.optional(
      Schema.String.annotations({
        description: 'Forsyth-Edwards Notation.',
      }),
    ),
  }),
  output: Schema.Struct({
    ascii: Schema.String,
  }),
});
