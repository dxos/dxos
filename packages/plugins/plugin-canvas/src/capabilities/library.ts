//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';

import { CanvasCapabilities } from '#types';

import { type MeshPresets } from '../samples/index.ts';

// The presets' OBJ sources are ~400KB, so they load on the first pick rather than with the module.
const preset = (id: MeshPresets.Preset, label: string, icon: string): CanvasCapabilities.LibraryItemContribution => ({
  id,
  label,
  icon,
  dim: '3d',
  make: async () => (await import('../samples/presets/MeshPresets.ts')).make(id),
});

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributeAll(CanvasCapabilities.LibraryItem, [
      preset('race', 'Race car', 'ph--car-profile--regular'),
      preset('firetruck', 'Fire engine', 'ph--fire-truck--regular'),
      preset('taxi', 'Taxi', 'ph--taxi--regular'),
    ]),
  ),
);
