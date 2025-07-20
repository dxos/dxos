//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, createResolver } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';

import { Board } from '../types';

export default () => [
  contributes(
    Capabilities.IntentResolver,
    createResolver({
      intent: Board.Create,
      resolve: ({ name }) => {
        return {
          data: {
            object: Obj.make(Board.Board, { name, layout: { size: { width: 5, height: 5 }, cells: {} } }),
          },
        };
      },
    }),
  ),
];
