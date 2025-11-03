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
      resolve: ({ name }) => ({
        data: {
          object: Obj.make(Board.Board, {
            name,
            items: [],
            layout: {
              size: {
                width: 5,
                height: 5,
              },
              cells: {},
            },
          }),
        },
      }),
    }),
  ),
];
