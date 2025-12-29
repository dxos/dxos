//
// Copyright 2025 DXOS.org
//

import { Capability, Common, createResolver } from '@dxos/app-framework';
import { View } from '@dxos/schema';

import { ExplorerAction, Graph } from '../types';

export default Capability.makeModule(() =>
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
);
