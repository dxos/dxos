//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Type } from '@dxos/echo';
import { GameCapabilities, type GameVariant } from '@dxos/plugin-game/types';

import { ChessArticle, ChessCard } from '#containers';
import { Chess } from '#types';

const CreateChessInput = Schema.Struct({
  name: Schema.optional(
    Schema.String.annotations({
      title: 'Name',
      description: 'Optional name for the game.',
    }),
  ),
  pgn: Schema.optional(
    Schema.String.annotations({
      title: 'PGN',
      description: 'Optional Portable Game Notation to start from.',
    }),
  ),
});

const variant: GameVariant = {
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

export default Capability.makeModule(() => Effect.succeed(Capability.contributes(GameCapabilities.VariantProvider, variant)));
