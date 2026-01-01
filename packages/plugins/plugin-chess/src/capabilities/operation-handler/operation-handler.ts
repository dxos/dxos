//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common, OperationResolver } from '@dxos/app-framework';

import { Chess, ChessOperation } from '../../types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Common.Capability.OperationHandler, [
      OperationResolver.make({
        operation: ChessOperation.Create,
        handler: ({ name, pgn }) =>
          Effect.succeed({
            object: Chess.make({ name, pgn }),
          }),
      }),
    ]),
  ),
);
