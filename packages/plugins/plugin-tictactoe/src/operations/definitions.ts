//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Database, Ref } from '@dxos/echo';
import { Operation } from '@dxos/compute';

import { TicTacToe } from '#types';

export const Create = Operation.make({
  meta: {
    key: 'org.dxos.function.tictactoe.create',
    name: 'Create Tic-Tac-Toe',
    description: 'Creates a new Tic-Tac-Toe game.',
  },
  input: Schema.Struct({
    name: Schema.optional(
      Schema.String.annotations({
        description: 'Name of the game.',
      }),
    ),
    size: Schema.optional(
      Schema.Number.annotations({
        description: 'Board dimension (3, 4, or 5). Default 3.',
      }),
    ),
    winCondition: Schema.optional(
      Schema.Number.annotations({
        description: 'Consecutive marks needed to win. Defaults to size.',
      }),
    ),
    level: Schema.optional(
      TicTacToe.Level.annotations({
        description: 'AI difficulty level.',
      }),
    ),
  }),
  output: TicTacToe.Game,
  services: [Database.Service],
});

export const MakeMove = Operation.make({
  meta: {
    key: 'org.dxos.function.tictactoe.move',
    name: 'Make Move',
    description: 'Places a marker on the board and updates game state.',
  },
  input: Schema.Struct({
    game: Ref.Ref(TicTacToe.Game).annotations({
      description: 'The ID of the Tic-Tac-Toe game.',
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
    key: 'org.dxos.function.tictactoe.ai-move',
    name: 'AI Move',
    description: 'Uses the AI engine to play the next move.',
  },
  input: Schema.Struct({
    game: Ref.Ref(TicTacToe.Game).annotations({
      description: 'The ID of the Tic-Tac-Toe game.',
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
    key: 'org.dxos.function.tictactoe.print',
    name: 'Print board',
    description: 'Prints the Tic-Tac-Toe board to ASCII.',
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
