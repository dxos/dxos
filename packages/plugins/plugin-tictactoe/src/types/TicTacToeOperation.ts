//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Operation } from '@dxos/compute';
import { Database, DXN } from '@dxos/echo';
import { GameRef } from '@dxos/plugin-game/types';

import { TicTacToe } from '#types';

export const MakeMove = Operation.make({
  meta: {
    key: DXN.make('org.dxos.function.tictactoe.move'),
    name: 'Make Move',
    description: 'Places a marker on the board and updates game state.',
    icon: 'ph--x--regular',
  },
  input: Schema.Struct({
    game: GameRef(TicTacToe.State).annotations({
      description: 'The ID of the game object (variant must be Tic-Tac-Toe).',
    }),
    position: Schema.String.annotations({
      description: 'Position as "row,col" e.g. "1,2".',
    }),
  }),
  output: Schema.Struct({
    board: Schema.String.annotations({
      description: 'The board state after the move.',
    }),
    status: Schema.String.annotations({
      description: 'The game status after the move.',
    }),
  }),
  services: [Database.Service],
});

export const AiMove = Operation.make({
  meta: {
    key: DXN.make('org.dxos.function.tictactoe.aiMove'),
    name: 'AI Move',
    description: 'Uses the AI engine to play the next move.',
    icon: 'ph--brain--regular',
  },
  input: Schema.Struct({
    game: GameRef(TicTacToe.State).annotations({
      description: 'The ID of the game object (variant must be Tic-Tac-Toe).',
    }),
    level: Schema.optional(
      TicTacToe.Level.annotations({
        description: 'Override AI difficulty level.',
      }),
    ),
  }),
  output: Schema.Struct({
    board: Schema.String.annotations({
      description: 'The board state after the AI move.',
    }),
    status: Schema.String.annotations({
      description: 'The game status after the AI move.',
    }),
    position: Schema.String.annotations({
      description: 'The position the AI chose as "row,col".',
    }),
  }),
  services: [Database.Service],
});

export const Print = Operation.make({
  meta: {
    key: DXN.make('org.dxos.function.tictactoe.print'),
    name: 'Print board',
    description: 'Prints the Tic-Tac-Toe board to ASCII.',
    icon: 'ph--terminal--regular',
  },
  input: Schema.Struct({
    board: Schema.String.annotations({
      description: 'The board string.',
    }),
    size: Schema.Number.annotations({
      description: 'Board dimension.',
    }),
  }),
  output: Schema.Struct({
    ascii: Schema.String,
  }),
});
