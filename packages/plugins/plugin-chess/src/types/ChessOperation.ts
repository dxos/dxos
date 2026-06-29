//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Operation } from '@dxos/compute';
import { DXN, Database } from '@dxos/echo';
import { GameRef } from '@dxos/plugin-game/types';

import * as Chess from './Chess';

export const Move = Operation.make({
  meta: {
    key: DXN.make('org.dxos.function.chess.move'),
    name: 'Move',
    description: 'Makes a move in the given chess game.',
    icon: 'ph--play--regular',
  },
  input: Schema.Struct({
    game: GameRef(Chess.State).annotations({
      description: 'The ID of the game object (variant must be Chess).',
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
    key: DXN.make('org.dxos.function.chess.play'),
    name: 'Play',
    description: 'Uses the chess engine to play the next move.',
    icon: 'ph--play--regular',
  },
  input: Schema.Struct({
    game: GameRef(Chess.State).annotations({
      description: 'The ID of the game object (variant must be Chess).',
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
    key: DXN.make('org.dxos.function.chess.print'),
    name: 'Print game',
    description: 'Prints the chess game to ASCII.',
    icon: 'ph--clipboard-text--regular',
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
