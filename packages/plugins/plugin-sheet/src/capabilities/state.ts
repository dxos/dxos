//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';

import { SheetCapabilities } from '#types';

const createGridRegistry = (): SheetCapabilities.GridRegistry => {
  const grids = new Map<string, SheetCapabilities.GridEntry>();
  return {
    register: (attendableId, entry) => {
      grids.set(attendableId, entry);
    },
    unregister: (attendableId) => {
      grids.delete(attendableId);
    },
    get: (attendableId) => grids.get(attendableId),
    getBySheetId: (sheetId) => {
      for (const entry of grids.values()) {
        if (entry.sheetId === sheetId) {
          return entry;
        }
      }
      return undefined;
    },
  };
};

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const gridInstances = createGridRegistry();
    return Capability.contributes(SheetCapabilities.GridInstances, gridInstances);
  }),
);
