//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability, UndoMapping } from '@dxos/app-framework';

import { meta } from '../meta';
import { SheetOperation } from '../operations';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.UndoMapping, [
      UndoMapping.make({
        operation: SheetOperation.DropAxis,
        inverse: SheetOperation.RestoreAxis,
        deriveContext: (input, output) => ({
          model: input.model,
          axis: output.axis,
          axisIndex: output.axisIndex,
          index: output.index,
          axisMeta: output.axisMeta,
          values: output.values,
        }),
        message: ['axis-dropped.label', { ns: meta.id }],
      }),
    ]),
  ),
);
