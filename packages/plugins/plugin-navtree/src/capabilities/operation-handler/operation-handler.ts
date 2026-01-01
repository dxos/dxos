//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common, OperationResolver } from '@dxos/app-framework';
import { log } from '@dxos/log';
import { Graph } from '@dxos/plugin-graph';

import { NavTreeCapabilities } from '../../types';

export default Capability.makeModule((context) =>
  Effect.succeed(
    Capability.contributes(Common.Capability.OperationHandler, [
      OperationResolver.make({
        operation: Common.LayoutOperation.Expose,
        handler: ({ subject }) =>
          Effect.promise(async () => {
            const { graph } = context.getCapability(Common.Capability.AppGraph);
            const { getItem, setItem } = context.getCapability(NavTreeCapabilities.State);

            try {
              const path = await Graph.waitForPath(graph, { target: subject }, { timeout: 1_000 });
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
    ]),
  ),
);
