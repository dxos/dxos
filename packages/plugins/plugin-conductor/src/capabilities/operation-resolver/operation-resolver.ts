//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common, OperationResolver } from '@dxos/app-framework';
import { ComputeGraph } from '@dxos/conductor';
import { Obj, Ref } from '@dxos/echo';
import { CanvasBoardType } from '@dxos/react-ui-canvas-editor';

import { ConductorOperation } from '../../types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Common.Capability.OperationResolver, [
      OperationResolver.make({
        operation: ConductorOperation.Create,
        handler: ({ name }) =>
          Effect.succeed({
            object: Obj.make(CanvasBoardType, {
              name,
              computeGraph: Ref.make(Obj.make(ComputeGraph, { graph: { nodes: [], edges: [] } })),
              layout: { nodes: [], edges: [] },
            }),
          }),
      }),
    ]),
  ),
);

