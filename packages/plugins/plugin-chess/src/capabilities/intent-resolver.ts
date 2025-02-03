//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, createResolver } from '@dxos/app-framework';
import { create } from '@dxos/live-object';

import { ChessAction, ChessType } from '../types';

export default () =>
  contributes(
    Capabilities.IntentResolver,
    createResolver(ChessAction.Create, ({ name }) => ({
      data: {
        object: create(ChessType, { name }),
      },
    })),
  );
