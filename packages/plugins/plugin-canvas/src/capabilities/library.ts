//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';

import { CanvasCapabilities } from '#types';

import type * as MeshPresets from '../samples/presets/MeshPresets.ts';

/** The vehicles' meshes are unit-sized; placed among one-unit shapes, they stand five units long. */
const VEHICLE_SCALE = { x: 5, y: 5, z: 5 };

// The presets' OBJ sources are ~400KB, so they load on the first pick rather than with the module.
const preset = (id: MeshPresets.Preset, label: string, icon: string): CanvasCapabilities.LibraryItemContribution => ({
  id,
  label,
  icon,
  dim: '3d',
  make: async () => {
    const object = (await import('../samples/presets/MeshPresets.ts')).make(id);
    // A vehicle stretched along one axis is no longer the vehicle, so it is only ever sized evenly.
    return object && { ...object, scale: VEHICLE_SCALE, lockAspect: true };
  },
});

/** The bundled vehicles the 3D library offers. */
export const LIBRARY_ITEMS: readonly CanvasCapabilities.LibraryItemContribution[] = [
  preset('race', 'Race car', 'ph--car-profile--regular'),
  preset('firetruck', 'Fire engine', 'ph--fire-truck--regular'),
  preset('taxi', 'Taxi', 'ph--taxi--regular'),
];

export default Capability.makeModule(() =>
  Effect.succeed(Capability.contributeAll(CanvasCapabilities.LibraryItem, LIBRARY_ITEMS)),
);
