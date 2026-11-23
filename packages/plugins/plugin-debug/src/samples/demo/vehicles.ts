//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { Database } from '@dxos/echo';
import * as Canvas from '@dxos/plugin-canvas/Canvas';
import * as MeshPresets from '@dxos/plugin-canvas/MeshPresets';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import { Scene } from '@dxos/scene';

/**
 * The scene's line-up, left to right: three race cars on a starting grid and the fire truck standing by at the end.
 * The models are unit-sized meshes, so a 2-unit pitch leaves a gap.
 */
export const VEHICLES: ReadonlyArray<MeshPresets.Placement> = [
  { preset: 'race', label: 'Race car 1', hue: 'blue', x: -3 },
  { preset: 'race', label: 'Race car 2', hue: 'amber', x: -1 },
  { preset: 'race', label: 'Race car 3', hue: 'purple', x: 1 },
  { preset: 'firetruck', label: 'Fire truck', hue: 'red', x: 3.25 },
];

export type VehiclesResult = { drawing: Drawing.Drawing };

/** A 3D canvas of the line-up: each vehicle model defined once in its library and placed with its own colour. */
export const Vehicles: SampleSpace.Partial<VehiclesResult> = SampleSpace.partial('vehicles', {
  schemas: [Drawing.Drawing, Canvas.Canvas, Scene.Model3D, Scene.Layout3D, Scene.Scene3D],
  run: () =>
    Effect.gen(function* () {
      const { canvas, model, layout, scene } = MeshPresets.makeLineup(VEHICLES);
      yield* Database.add(model);
      yield* Database.add(layout);
      yield* Database.add(scene);
      const stored = yield* Database.add(canvas);
      const drawing = yield* Database.add(Drawing.make({ name: 'Race day', canvas: stored }));
      return { drawing };
    }),
});
