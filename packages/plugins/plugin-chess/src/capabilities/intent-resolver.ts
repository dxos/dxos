//
// Copyright 2025 DXOS.org
//

import { Capabilities, Capability, createResolver } from '@dxos/app-framework';

import { Chess, ChessAction } from '../types';

export default Capability.makeModule(() =>
  Capability.contributes(
    Capabilities.IntentResolver,
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
);
