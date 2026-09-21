//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';

import { SheetCapabilities } from '#types';
import { SheetEvents } from '#types';

const createGridRegistry = (): SheetCapabilities.GridRegistry => {
  const grids = new Map<string, SheetCapabilities.GridEntry>();
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

export const SheetState = Capability.makeModule(
  'SheetState',
  { provides: [SheetCapabilities.GridInstances], activatesOn: SheetEvents.Start },
  Effect.fnUntraced(function* () {
    const gridInstances = createGridRegistry();
    return Capability.contribute(SheetCapabilities.GridInstances, gridInstances);
  }),
);
