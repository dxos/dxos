//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, createResolver } from '@dxos/app-framework';
import { ComputeGraph } from '@dxos/conductor';
import { live, makeRef } from '@dxos/live-object';
import { CanvasBoardType } from '@dxos/react-ui-canvas-editor';

import { ConductorAction } from '../types';

export default () =>
  contributes(
    Capabilities.IntentResolver,
    createResolver({
      intent: ConductorAction.Create,
      resolve: ({ name }) => ({
        data: {
          object: live(CanvasBoardType, {
            name,
            computeGraph: makeRef(live(ComputeGraph, { graph: { nodes: [], edges: [] } })),
            layout: { nodes: [], edges: [] },
          }),
        },
      }),
    }),
  );
