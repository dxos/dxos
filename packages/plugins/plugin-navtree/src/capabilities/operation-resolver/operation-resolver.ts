//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities, LayoutOperation } from '@dxos/app-toolkit';
import { log } from '@dxos/log';
import { OperationResolver } from '@dxos/operation';
import { Graph } from '@dxos/plugin-graph';
import { expandAttendableId } from '@dxos/react-ui-attention';

import { NavTreeCapabilities } from '../../types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributes(Capabilities.OperationResolver, [
      OperationResolver.make({
        operation: LayoutOperation.Expose,
        handler: Effect.fnUntraced(function* ({ subject }) {
          const { graph } = yield* Capability.get(AppCapabilities.AppGraph);
          const { getItem, setItem } = yield* Capability.get(NavTreeCapabilities.State);

          const prefixes = expandAttendableId(subject);

          for (const qualifiedId of prefixes) {
            Graph.expand(graph, qualifiedId, 'child');

            const treePath = prefixes.slice(0, prefixes.indexOf(qualifiedId) + 1);
            const state = getItem(treePath);
            if (!state.open) {
              setItem(treePath, 'open', true);
            }
          }

          if (Option.isNone(Graph.getNode(graph, subject))) {
            log('Node not found after expansion', { subject });
          }
        }),
      }),
    ]);
  }),
);
