//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, createResolver } from '@dxos/app-framework';
import { ComputeGraph } from '@dxos/conductor';
import { create, makeRef } from '@dxos/live-object';
import { CanvasBoardType } from '@dxos/react-ui-canvas-editor';

import { ConductorAction } from '../types';

export default () =>
  contributes(
    Capabilities.IntentResolver,
    createResolver({
      intent: ConductorAction.Create,
      resolve: ({ name }) => ({
        data: {
          object: create(CanvasBoardType, {
            name,
            computeGraph: makeRef(create(ComputeGraph, { graph: { nodes: [], edges: [] } })),
            layout: { nodes: [], edges: [] },
          }),
        },
      }),
    }),
  );
