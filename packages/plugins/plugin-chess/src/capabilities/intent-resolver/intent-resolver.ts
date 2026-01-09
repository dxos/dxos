//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common, createResolver } from '@dxos/app-framework';

import { Chess, ChessAction } from '../../types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(
      Common.Capability.IntentResolver,
      createResolver({
        intent: ChessAction.Create,
        resolve: ({ name, pgn }: { name: string; pgn?: string }) => {
          return {
            data: {
              object: Chess.make({ name, pgn }),
            },
          };
        },
      }),
    ),
  ),
);
