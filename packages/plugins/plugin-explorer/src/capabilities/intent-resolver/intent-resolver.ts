//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common, createResolver } from '@dxos/app-framework';
import { View } from '@dxos/schema';

import { ExplorerAction, Graph } from '../../types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(
      Common.Capability.IntentResolver,
      createResolver({
        intent: ExplorerAction.CreateGraph,
        resolve: async ({ db, name, typename }) => {
          const { view } = await View.makeFromDatabase({ db, typename });
          const graph = Graph.make({ name, view });
          return { data: { object: graph } };
        },
      }),
    ),
  ),
);
