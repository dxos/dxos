//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';

import { type GridEntry, type GridRegistry, SheetCapabilities } from '../../types';

const createGridRegistry = (): GridRegistry => {
  const grids = new Map<string, GridEntry>();
  return {
    register: (attendableId, grid, setActiveRefs) => {
      grids.set(attendableId, { grid, setActiveRefs });
    },
    unregister: (attendableId) => {
      grids.delete(attendableId);
    },
    get: (attendableId) => grids.get(attendableId),
  };
};

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const gridInstances = createGridRegistry();
    return Capability.contributes(SheetCapabilities.GridInstances, gridInstances);
  }),
);
