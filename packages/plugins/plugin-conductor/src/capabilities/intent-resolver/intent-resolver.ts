//
// Copyright 2025 DXOS.org
//

import { Capability, Common, createResolver } from '@dxos/app-framework';
import { ComputeGraph } from '@dxos/conductor';
import { Obj, Ref } from '@dxos/echo';
import { CanvasBoardType } from '@dxos/react-ui-canvas-editor';

import { ConductorAction } from '../../types';

export default Capability.makeModule(() =>
  Capability.contributes(
    Common.Capability.IntentResolver,
    createResolver({
      intent: ConductorAction.Create,
      resolve: ({ name }: { name: string }) => ({
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
