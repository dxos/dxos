//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppGraph from '@dxos/app-graph/AppGraph';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';
import * as AttentionCapabilities from '@dxos/plugin-attention/AttentionCapabilities';
import { Path } from '@dxos/react-ui-list/util';

import { DebugNodes, DebugOperation } from '#types';

import { DEBUG_PANEL_CONTEXT, debugPanelAspect } from '../containers/DebugPanel/view-state.ts';

const handler: Operation.WithHandler<typeof DebugOperation.OpenPage> = DebugOperation.OpenPage.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ nodeId }) {
      const { graph } = yield* Capability.get(AppCapabilities.AppGraph);
      const viewState = yield* Capability.get(AttentionCapabilities.ViewState);

      // The page's ancestors are built by connectors that run only on expansion.
      AppGraph.expandPath(graph, nodeId);

      // Tree paths run root, tree id, then each ancestor's qualified id; open every branch above the page.
      const segments = nodeId.split('/');
      const ancestors = segments
        .slice(0, -1)
        .map((_, index) => segments.slice(0, index + 1).join('/'))
        .filter((id) => id.startsWith(DebugNodes.DEBUG_ROOT_ID) && id !== DebugNodes.DEBUG_ROOT_ID);
      const branches = ancestors.map((_, index) =>
        Path.create(DebugNodes.DEBUG_ROOT_ID, DEBUG_PANEL_CONTEXT, ...ancestors.slice(0, index + 1)),
      );
      viewState.update(debugPanelAspect, DEBUG_PANEL_CONTEXT, (prev) => ({
        ...prev,
        nodeId,
        open: [...new Set([...prev.open, ...branches])],
      }));

      // A floating panel is opened by its own status-bar trigger; it shows the page when next opened.
      if ((viewState.get(debugPanelAspect, DEBUG_PANEL_CONTEXT).mode ?? 'docked') === 'docked') {
        yield* Operation.invoke(LayoutOperation.UpdateDrawer, { state: 'open' });
      }
    }),
  ),
);

export default handler;
