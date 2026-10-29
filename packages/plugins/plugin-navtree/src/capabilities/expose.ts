//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppGraph from '@dxos/app-graph/AppGraph';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const layout = yield* Capabilities.getAtomValue(AppCapabilities.Layout);
    const { invokePromise } = yield* Capabilities.OperationInvoker;
    const { graph } = yield* AppCapabilities.AppGraph;
    if (invokePromise && layout.active.length === 1) {
      // TODO(wittjosiah): This should really be fired once the navtree renders for the first time.
      //   That is the point at which the graph is expanded and the path should be available.
      void AppGraph.waitForPath(graph, { target: layout.active[0] }, { timeout: 30_000 })
        .then(() => invokePromise(LayoutOperation.Expose, { subject: layout.active[0] }))
        .catch(() => {});
    }

    return [];
  }),
);
