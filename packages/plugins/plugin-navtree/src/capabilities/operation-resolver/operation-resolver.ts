//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities, LayoutOperation } from '@dxos/app-toolkit';
import { log } from '@dxos/log';
import { OperationResolver } from '@dxos/operation';
import { Graph } from '@dxos/plugin-graph';

import { NavTreeCapabilities } from '../../types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributes(Capabilities.OperationResolver, [
      OperationResolver.make({
        operation: LayoutOperation.Expose,
        handler: Effect.fnUntraced(function* ({ subject }) {
          // TODO(wittjosiah): There's a lot of scenarios where this will fail.
          //   Probably needs to be aware of the composer ontology to more reliably ensure objects are accessible.
          const { graph } = yield* Capability.get(AppCapabilities.AppGraph);
          const { getItem, setItem } = yield* Capability.get(NavTreeCapabilities.State);
          yield* Effect.tryPromise(() => Graph.waitForPath(graph, { target: subject }, { timeout: 1_000 })).pipe(
            Effect.andThen((path) => {
              [...Array(path.length)].forEach((_, index) => {
                const subpath = path.slice(0, index);
                const value = getItem(subpath);
                if (!value.open) {
                  setItem(subpath, 'open', true);
                }
              });
            }),
            Effect.catchAll(() => {
              log('Path to node not found', { subject });
              return Effect.void;
            }),
          );
        }),
      }),
    ]);
  }),
);
