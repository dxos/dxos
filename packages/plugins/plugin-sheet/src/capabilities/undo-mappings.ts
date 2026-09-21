//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as UndoMapping from '@dxos/app-framework/UndoMapping';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { meta } from '#meta';
import { SheetOperation } from '#types';
import { SheetEvents } from '#types';

export const UndoMappings = AppCapability.undoMappings(
  () =>
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
  {
    activatesOn: SheetEvents.Start,
    environments: ['node'],
  },
);
