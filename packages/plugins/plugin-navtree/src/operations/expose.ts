//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, LayoutOperation } from '@dxos/app-toolkit';
import { log } from '@dxos/log';
import { Operation } from '@dxos/operation';
import { Graph } from '@dxos/plugin-graph';
import { expandAttendableId } from '@dxos/react-ui-attention';

import { NavTreeCapabilities } from '../types';

const handler: Operation.WithHandler<typeof LayoutOperation.Expose> = LayoutOperation.Expose.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ subject }) {
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
  ),
);

export default handler;
