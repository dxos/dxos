//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppGraph from '@dxos/app-graph/AppGraph';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';
import { log } from '@dxos/log';
import { Attention } from '@dxos/react-ui-attention/types';

import { NavTreeCapabilities } from '#types';

const handler: Operation.WithHandler<typeof LayoutOperation.Expose> = LayoutOperation.Expose.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ subject }) {
      const { graph } = yield* Capability.get(AppCapabilities.AppGraph);
      const { getItem, setItem } = yield* Capability.get(NavTreeCapabilities.State);

      const ancestors = Attention.expandAttendableId(subject).slice(0, -1);

      for (const [index, qualifiedId] of ancestors.entries()) {
        AppGraph.expandSync(graph, qualifiedId, 'child');

        const treePath = ancestors.slice(0, index + 1);
        if (!getItem(treePath).open) {
          setItem(treePath, 'open', true);
        }
      }

      if (Option.isNone(AppGraph.getNode(graph, subject))) {
        log('Node not found after expansion', { subject });
      }
    }),
  ),
);

export default handler;
