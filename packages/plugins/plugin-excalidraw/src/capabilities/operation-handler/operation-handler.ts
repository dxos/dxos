//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common, OperationResolver } from '@dxos/app-framework';
import { Diagram } from '@dxos/plugin-sketch/types';

import { EXCALIDRAW_SCHEMA, SketchOperation } from '../../types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Common.Capability.OperationHandler, [
      OperationResolver.make({
        operation: SketchOperation.Create,
        handler: ({ name, schema = EXCALIDRAW_SCHEMA, content = {} }) =>
          Effect.succeed({
            object: Diagram.make({ name, canvas: { schema, content } }),
          }),
      }),
    ]),
  ),
);

