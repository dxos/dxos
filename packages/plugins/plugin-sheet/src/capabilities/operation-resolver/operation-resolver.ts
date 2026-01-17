//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common, UndoMapping } from '@dxos/app-framework';
import { OperationResolver } from '@dxos/operation';

import { meta } from '../../meta';
import { SheetOperation } from '../../types';

export default Capability.makeModule(() =>
  Effect.succeed([
    Capability.contributes(Common.Capability.UndoMapping, [
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
        message: ['axis dropped label', { ns: meta.id }],
      }),
    ]),
    Capability.contributes(Common.Capability.OperationResolver, [
      OperationResolver.make({
        operation: SheetOperation.InsertAxis,
        handler: ({ model, axis, index, count }) =>
          Effect.sync(() => {
            model[axis === 'col' ? 'insertColumns' : 'insertRows'](index, count);
          }),
      }),
      OperationResolver.make({
        operation: SheetOperation.DropAxis,
        handler: ({ model, axis, axisIndex }) =>
          Effect.sync(() => {
            const undoData = model[axis === 'col' ? 'dropColumn' : 'dropRow'](axisIndex);
            // Return data needed for undo.
            return {
              axis: undoData.axis,
              axisIndex: undoData.axisIndex,
              index: undoData.index,
              axisMeta: undoData.axisMeta,
              values: undoData.values,
            };
          }),
      }),

      //
      // RestoreAxis (inverse of DropAxis)
      //
      OperationResolver.make({
        operation: SheetOperation.RestoreAxis,
        handler: ({ model, axis, ...restoreData }) =>
          Effect.sync(() => {
            model[axis === 'col' ? 'restoreColumn' : 'restoreRow'](restoreData);
          }),
      }),
    ]),
  ]),
);
