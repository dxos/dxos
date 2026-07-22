//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Type } from '@dxos/echo';
import { GameCapabilities, type GameVariant } from '@dxos/plugin-game/types';

import { TicTacToeArticle, TicTacToeCard } from '#containers';
import { TicTacToe } from '#types';

const CreateTicTacToeInput = Schema.Struct({
  name: Schema.optional(
    Schema.String.annotations({
      title: 'Name',
      description: 'Optional name for the game.',
    }),
  ),
  size: Schema.optional(
    Schema.Number.annotations({
      title: 'Size',
      description: 'Board dimension (3, 4, or 5). Default 3.',
    }),
  ),
  winCondition: Schema.optional(
    Schema.Number.annotations({
      title: 'Win condition',
      description: 'Consecutive marks needed to win. Defaults to size.',
    }),
  ),
  level: Schema.optional(
    TicTacToe.Level.annotations({
      title: 'AI level',
      description: 'AI difficulty level (omit for human-vs-human).',
    }),
  ),
});

const variant: GameVariant = {
  id: Type.getTypename(TicTacToe.State),
  label: 'Tic-Tac-Toe',
  icon: 'ph--hash-straight--regular',
  variantType: TicTacToe.State,
  inputSchema: CreateTicTacToeInput,
  roles: ['x', 'o'] as const,
  createVariant: (input) =>
    Effect.sync(() =>
      TicTacToe.make({
        size: typeof input.size === 'number' ? input.size : undefined,
        winCondition: typeof input.winCondition === 'number' ? input.winCondition : undefined,
        level: input.level as TicTacToe.Level | undefined,
      }),
    ),
  card: TicTacToeCard,
  article: TicTacToeArticle,
};

export default Capability.makeModule(() =>
  Effect.succeed(Capability.provide(GameCapabilities.VariantProvider, variant)),
);
