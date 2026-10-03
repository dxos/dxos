//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { useCallback } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import * as AppGraph from '@dxos/app-graph/AppGraph';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as NavigationOperation from '@dxos/app-toolkit/NavigationOperation';
import { useAppGraph } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { EID } from '@dxos/keys';

/** How long to wait for a just-stored object to appear in the app graph before opening anyway. */
const GRAPH_NODE_TIMEOUT = '10 seconds';

/**
 * Opens a stored object as a plank.
 *
 * An object stored moments ago has no graph node yet, and the deck cannot open a node it cannot
 * find; expanding only asks the connectors, so wait for the node to land.
 */
export const useOpenObject = (): ((object: Obj.Any) => Promise<void>) => {
  const { invokePromise } = useOperationInvoker();
  const { graph } = useAppGraph();

  return useCallback(
    async (object: Obj.Any) => {
      const db = Obj.getDatabase(object);
      if (!db) {
        return;
      }

      const { data } = await invokePromise(NavigationOperation.ResolveNavigationTargets, {
        query: { uri: EID.make({ spaceId: db.spaceId, entityId: object.id }) },
      });
      const path = data?.targets[0]?.path ?? GraphPath.getObjectPathFromObject(object);
      AppGraph.expandPath(graph, path);
      await EffectEx.runPromise(AppGraph.waitFor(graph, path).pipe(Effect.timeout(GRAPH_NODE_TIMEOUT), Effect.ignore));
      await invokePromise(LayoutOperation.Open, { subject: [path], disposition: 'add' });
    },
    [invokePromise, graph],
  );
};
