//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common, createResolver } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';

import { Board } from '../../types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(
      Common.Capability.IntentResolver,
      createResolver({
        intent: Board.Create,
        resolve: ({ name }: { name: string }) => {
          return {
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
          };
        },
      }),
    ),
  ),
);
