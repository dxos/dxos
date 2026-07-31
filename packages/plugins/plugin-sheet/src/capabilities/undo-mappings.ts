//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { UndoMapping } from '@dxos/app-framework';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';

import { meta } from '#meta';
import { SheetOperation } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(Capabilities.UndoMapping, [
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
        message: ['axis-dropped.label', { ns: meta.profile.key }],
      }),
    ]),
  ),
);
