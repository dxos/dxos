//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common } from '@dxos/app-framework';
import { log } from '@dxos/log';
import { OperationResolver } from '@dxos/operation';
import { Graph } from '@dxos/plugin-graph';

import { NavTreeCapabilities } from '../../types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributes(Common.Capability.OperationResolver, [
      OperationResolver.make({
        operation: Common.LayoutOperation.Expose,
        handler: ({ subject }) =>
          Effect.gen(function* () {
            const { graph } = yield* Capability.get(Common.Capability.AppGraph);
            const { getItem, setItem } = yield* Capability.get(NavTreeCapabilities.State);
            try {
              const path = yield* Effect.promise(() =>
                Graph.waitForPath(graph, { target: subject }, { timeout: 1_000 }),
              );
              [...Array(path.length)].forEach((_, index) => {
                const subpath = path.slice(0, index);
                const value = getItem(subpath);
                if (!value.open) {
                  setItem(subpath, 'open', true);
                }
              });
            } catch {
              log('Path to node not found', { subject });
            }
          }),
      }),
    ]);
  }),
);
