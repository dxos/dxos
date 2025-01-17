//
// Copyright 2025 DXOS.org
//

import { contributes, Capabilities, createResolver } from '@dxos/app-framework';

import { SHEET_PLUGIN } from '../meta';
import { createSheet, SheetAction } from '../types';

export default () =>
  contributes(Capabilities.IntentResolver, [
    createResolver(SheetAction.Create, ({ name }) => ({ data: { object: createSheet({ name }) } })),
    createResolver(SheetAction.InsertAxis, ({ model, axis, index, count }) => {
      const _indices = model[axis === 'col' ? 'insertColumns' : 'insertRows'](index, count);
    }),
    createResolver(SheetAction.DropAxis, ({ model, axis, axisIndex, deletionData }, undo) => {
      if (!undo) {
        const undoData = model[axis === 'col' ? 'dropColumn' : 'dropRow'](axisIndex);
        return {
          undoable: {
            message: [`${axis} dropped label`, { ns: SHEET_PLUGIN }],
            data: { ...undoData, model },
          },
        };
      } else if (undo && deletionData) {
        model[deletionData.axis === 'col' ? 'restoreColumn' : 'restoreRow'](deletionData);
      }
    }),
  ]);
