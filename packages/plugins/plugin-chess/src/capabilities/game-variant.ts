//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import * as Capability from '@dxos/app-framework/Capability';
import { Type } from '@dxos/echo';
import * as GameCapabilities from '@dxos/plugin-game/GameCapabilities';
import * as GameEvents from '@dxos/plugin-game/GameEvents';

import { ChessArticle, ChessCard } from '#containers';
import { Chess } from '#types';

const CreateChessInput = Schema.Struct({
  name: Schema.optional(
    Schema.String.annotate({
      title: 'Name',
      description: 'Optional name for the game.',
    }),
  ),
  pgn: Schema.optional(
    Schema.String.annotate({
      title: 'PGN',
      description: 'Optional Portable Game Notation to start from.',
    }),
  ),
});

const variant: GameCapabilities.GameVariant = {
  id: Type.getTypename(Chess.State),
  label: 'Chess',
  icon: 'ph--shield-chevron--regular',
  variantType: Chess.State,
  inputSchema: CreateChessInput,
  roles: ['white', 'black'] as const,
  createVariant: (input) =>
    Effect.sync(() => Chess.make({ pgn: typeof input.pgn === 'string' ? input.pgn : undefined })),
  card: ChessCard,
  article: ChessArticle,
};

// Browser-only: the variant descriptor carries the `card`/`article` React components the game
// host renders, so the module cannot load without a DOM.
export const GameVariant = Capability.makeModule(
  'GameVariant',
  { provides: [GameCapabilities.VariantProvider], activatesOn: GameEvents.Start, environments: [] },
  () => Effect.succeed(Capability.contribute(GameCapabilities.VariantProvider, variant)),
);
