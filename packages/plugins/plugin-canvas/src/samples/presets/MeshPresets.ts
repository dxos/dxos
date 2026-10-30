//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { Obj } from '@dxos/echo';
import { meshObject, parseOBJ } from '@dxos/react-ui-scene/io';
import { Scene } from '@dxos/scene';

import firetruckObj from '../../../assets/models/firetruck.obj?raw';
import raceObj from '../../../assets/models/race.obj?raw';
import taxiObj from '../../../assets/models/taxi.obj?raw';
import { makeCanvas } from '../../model/canvas-document.ts';

/** Bundled vehicle models (Kenney's), each defined once in a model as a `mesh` object. */
export const PRESETS = ['firetruck', 'race', 'taxi'] as const;
export type Preset = (typeof PRESETS)[number];

const OBJ: Record<Preset, string> = { firetruck: firetruckObj, race: raceObj, taxi: taxiObj };

/** The preset as a `mesh` object, its id the preset's name; undefined if its OBJ does not parse. */
export const make = (preset: Preset): Scene.Object3D | undefined => {
  const triangles = parseOBJ(OBJ[preset]);
  return triangles && meshObject(preset, triangles);
};

export type Placement = { preset: Preset; label: string; hue: string; x: number };

/**
 * A 3D canvas of presets in a row along x: each preset is one object in the model however often it is placed, and
 * each placement an element with its own label and hue. The objects are made, not added; the caller adds them.
 */
export const makeLineup = (placements: readonly Placement[]) => {
  const created = makeCanvas({ dimension: '3d' });
  const { model, layout, scene } = created;
  if (
    !Obj.instanceOf(Scene.Model3D, model) ||
    !Obj.instanceOf(Scene.Layout3D, layout) ||
    !Obj.instanceOf(Scene.Scene3D, scene)
  ) {
    return created;
  }
  // Framed a little above and to the side, so the whole row reads at once.
  Obj.update(scene, (scene) => {
    scene.camera = {
      target: { x: 0, y: 0.5, z: 0 },
      yaw: -30,
      pitch: 25,
      distance: 12,
      fov: 0.8,
      projection: 'perspective',
    };
  });
  Obj.update(model, (model) => {
    for (const preset of new Set(placements.map(({ preset }) => preset))) {
      const object = make(preset);
      // Stored as a fresh record, since the made one is read-only.
      object && (model.objects[preset] = { id: object.id, type: object.type, props: { ...object.props } });
    }
  });
  Obj.update(layout, (layout) => {
    placements.forEach(({ preset, label, hue, x }, index) => {
      const id = `${preset}-${index + 1}`;
      layout.elements[id] = { id, object: preset, label, center: { x, y: 0, z: 0 }, overrides: { hue } };
    });
  });
  return created;
};
