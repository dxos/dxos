//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common, OperationResolver } from '@dxos/app-framework';
import { View } from '@dxos/schema';

import { ExplorerOperation, Graph } from '../../types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Common.Capability.OperationResolver, [
      OperationResolver.make({
        operation: ExplorerOperation.CreateGraph,
        handler: ({ db, name, typename }) =>
          Effect.gen(function* () {
            const { view } = yield* Effect.promise(() => View.makeFromDatabase({ db, typename }));
            const graph = Graph.make({ name, view });
            return { object: graph };
          }),
      }),
    ]),
  ),
);
