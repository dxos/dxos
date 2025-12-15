//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, createResolver } from '@dxos/app-framework';

import { Chess, ChessAction } from '../types';

export default () =>
  contributes(
    Capabilities.IntentResolver,
    createResolver({
      intent: ChessAction.Create,
      resolve: ({ name, pgn }) => {
        return {
          data: {
            object: Chess.make({ name, pgn }),
          },
        };
      },
    }),
  );
