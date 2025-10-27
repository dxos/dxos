//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, createResolver } from '@dxos/app-framework';

import { meta } from '../meta';
import { Sheet, SheetAction } from '../types';

export default () =>
  contributes(Capabilities.IntentResolver, [
    createResolver({
      intent: SheetAction.Create,
      resolve: ({ name }) => ({ data: { object: Sheet.make({ name }) } }),
    }),
    createResolver({
      intent: SheetAction.InsertAxis,
      resolve: ({ model, axis, index, count }) => {
        const _indices = model[axis === 'col' ? 'insertColumns' : 'insertRows'](index, count);
      },
    }),
    createResolver({
      intent: SheetAction.DropAxis,
      resolve: ({ model, axis, axisIndex, deletionData }, undo) => {
        if (!undo) {
          const undoData = model[axis === 'col' ? 'dropColumn' : 'dropRow'](axisIndex);
          return {
            undoable: {
              message: [`${axis} dropped label`, { ns: meta.id }],
              data: { ...undoData, model },
            },
          };
        } else if (undo && deletionData) {
          model[deletionData.axis === 'col' ? 'restoreColumn' : 'restoreRow'](deletionData);
        }
      },
    }),
  ]);
