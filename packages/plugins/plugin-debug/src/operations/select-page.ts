//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppGraph from '@dxos/app-graph/AppGraph';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as Operation from '@dxos/compute/Operation';
import * as AttentionCapabilities from '@dxos/plugin-attention/AttentionCapabilities';

import { DebugOperation } from '#types';

import { DEBUG_PANEL_CONTEXT, debugPanelAspect } from '../containers/DebugPanel/view-state.ts';

const handler: Operation.WithHandler<typeof DebugOperation.SelectPage> = DebugOperation.SelectPage.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ nodeId }) {
      const { graph } = yield* Capability.get(AppCapabilities.AppGraph);
      const viewState = yield* Capability.get(AttentionCapabilities.ViewState);
      AppGraph.expandPath(graph, nodeId);
      viewState.update(debugPanelAspect, DEBUG_PANEL_CONTEXT, (state) => ({ ...state, nodeId }));
    }),
  ),
);

export default handler;
