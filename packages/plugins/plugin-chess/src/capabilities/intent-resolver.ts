//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, createResolver } from '@dxos/app-framework';
import { create } from '@dxos/live-object';

import { ChessAction, GameType } from '../types';

export default () =>
  contributes(
    Capabilities.IntentResolver,
    createResolver({
      intent: ChessAction.Create,
      resolve: ({ name }) => ({
        data: {
          object: create(GameType, { name }),
        },
      }),
    }),
  );
