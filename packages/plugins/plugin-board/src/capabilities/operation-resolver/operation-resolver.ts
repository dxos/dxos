//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common, OperationResolver } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';

import { Board, BoardOperation } from '../../types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Common.Capability.OperationResolver, [
      OperationResolver.make({
        operation: BoardOperation.Create,
        handler: ({ name }) =>
          Effect.succeed({
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
          }),
      }),
    ]),
  ),
);
