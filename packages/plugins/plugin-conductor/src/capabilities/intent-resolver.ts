//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, createResolver, defineCapabilityModule } from '@dxos/app-framework';
import { ComputeGraph } from '@dxos/conductor';
import { Obj, Ref } from '@dxos/echo';
import { CanvasBoardType } from '@dxos/react-ui-canvas-editor';

import { ConductorAction } from '../types';

export default defineCapabilityModule(() =>
  contributes(
    Capabilities.IntentResolver,
    createResolver({
      intent: ConductorAction.Create,
      resolve: ({ name }) => ({
        data: {
          object: Obj.make(CanvasBoardType, {
            name,
            computeGraph: Ref.make(Obj.make(ComputeGraph, { graph: { nodes: [], edges: [] } })),
            layout: { nodes: [], edges: [] },
          }),
        },
      }),
    }),
  ),
);
