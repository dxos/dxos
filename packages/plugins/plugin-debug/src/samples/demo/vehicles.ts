//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { Database, Obj, Ref } from '@dxos/echo';
import * as Model from '@dxos/plugin-spacetime/Model';
import * as Scene from '@dxos/plugin-spacetime/Scene';
import * as SpacetimePresets from '@dxos/plugin-spacetime/SpacetimePresets';

/**
 * The scene's line-up, left to right: three race cars on a starting grid and the fire truck standing by at the end.
 * The models are y-up and face +z, about 1.3 (cars) and 1.5 (truck) units wide, so a 2-unit pitch leaves a gap.
 */
export const VEHICLES: ReadonlyArray<{ preset: Model.PresetType; label: string; color: string; x: number }> = [
  { preset: 'race', label: 'Race car 1', color: 'blue', x: -3 },
  { preset: 'race', label: 'Race car 2', color: 'amber', x: -1 },
  { preset: 'race', label: 'Race car 3', color: 'purple', x: 1 },
  { preset: 'firetruck', label: 'Fire truck', color: 'red', x: 3.25 },
];

export type VehiclesResult = { scene: Scene.Scene };

/** A spacetime scene of the line-up, each vehicle a preset model with its own colour and place on the grid. */
export const Vehicles: SampleSpace.Partial<VehiclesResult> = SampleSpace.partial('vehicles', {
  schemas: [Scene.Scene, Model.Object],
  run: () =>
    Effect.gen(function* () {
      const objects: Model.Object[] = [];
      for (const { preset, label, color, x } of VEHICLES) {
        const object = SpacetimePresets.make(preset, { label, color, position: { x, y: 0, z: 0 } });
        if (object) {
          objects.push(yield* Database.add(object));
        }
      }
      // Built directly rather than with `Scene.make`, which seeds a default cube the line-up does not want.
      const scene = yield* Database.add(
        Obj.make(Scene.Scene, { name: 'Race day', objects: objects.map((object) => Ref.make(object)) }),
      );
      return { scene };
    }),
});
