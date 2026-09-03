//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Operation from '@dxos/compute/Operation';
import { Database, DXN, Ref } from '@dxos/echo';
import * as Game from '@dxos/plugin-game/Game';

import * as Chess from './Chess.ts';
import * as PlayerReview from './PlayerReview.ts';

export const Move = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.chess.move'),
    name: 'Move',
    description: 'Makes a move in the given chess game.',
    icon: 'ph--play--regular',
  },
  input: Schema.Struct({
    game: Game.GameRef(Chess.State).annotate({
      description: 'The ID of the game object (variant must be Chess).',
    }),
    move: Schema.String.annotate({
      description: 'The move to make in the chess game.',
      examples: ['e4', 'Bf3'],
    }),
  }),
  output: Schema.Struct({
    pgn: Schema.String.annotate({
      description: 'The PGN of the game after the move was played.',
    }),
  }),
  services: [Database.Service],
});

export const Play = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.chess.play'),
    name: 'Play',
    description: 'Uses the chess engine to play the next move.',
    icon: 'ph--play--regular',
  },
  input: Schema.Struct({
    game: Game.GameRef(Chess.State).annotate({
      description: 'The ID of the game object (variant must be Chess).',
    }),
    side: Schema.optional(Schema.Literals(['white', 'black', 'any'])).annotate({
      description: 'The side to play.',
      defaultValue: 'any',
    }),
  }),
  output: Schema.Struct({
    pgn: Schema.String.annotate({
      description: 'The PGN of the game after the move was played.',
    }),
    move: Schema.optional(Schema.String).annotate({
      description: 'The move that was played.',
    }),
  }),
  services: [Database.Service],
});

export const Print = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.chess.print'),
    name: 'Print game',
    description: 'Prints the chess game to ASCII.',
    icon: 'ph--clipboard-text--regular',
  },
  input: Schema.Struct({
    pgn: Schema.optional(
      Schema.String.annotate({
        description: 'Portable Game Notation.',
      }),
    ),
    fen: Schema.optional(
      Schema.String.annotate({
        description: 'Forsyth-Edwards Notation.',
      }),
    ),
  }),
  output: Schema.Struct({
    ascii: Schema.String,
  }),
});

/** Rebuilds a player review position index from all chess games in the space. */
export const RebuildPositionIndex = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.chess.rebuildPositionIndex'),
    name: 'Rebuild Position Index',
    description: 'Scans chess games and updates the player review position index.',
    icon: 'ph--arrows-clockwise--regular',
  },
  services: [Database.Service],
  input: Schema.Struct({
    review: Ref.Ref(PlayerReview.Review).annotate({
      description: 'Player review whose position index should be rebuilt.',
    }),
  }),
  output: Schema.Struct({
    gamesScanned: Schema.Number,
    positionsUpdated: Schema.Number,
  }),
}).pipe(Operation.visible);
