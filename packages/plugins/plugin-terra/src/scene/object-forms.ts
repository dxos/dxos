//
// Copyright 2026 DXOS.org
//

import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import { CreateCylinder } from '@babylonjs/core/Meshes/Builders/cylinderBuilder';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { type Scene } from '@babylonjs/core/scene';

import { type TerraObject } from '../types';

/** Half-turn about X: Babylon builders extrude along +Y, but forms are authored forward-along-+Z. */
const HALF_PI = Math.PI / 2;

/** Matte material (no specular highlight), matching Phase 1's NPR style. */
const matte = (name: string, scene: Scene, color: Color3): StandardMaterial => {
  const material = new StandardMaterial(name, scene);
  material.diffuseColor = color;
  material.specularColor = new Color3(0, 0, 0);
  return material;
};

/** Merges and flat-shades a set of primitive parts into one base mesh for thin-instancing. */
const mergeParts = (name: string, parts: Mesh[], scene: Scene, color: Color3): Mesh => {
  const merged = Mesh.MergeMeshes(parts, true, true, undefined, false, false);
  if (!merged) {
    throw new Error(`Failed to merge object form: ${name}`);
  }
  merged.name = name;
  merged.convertToFlatShadedMesh();
  merged.material = matte(`${name}Mat`, scene, color);
  merged.isVisible = false;
  return merged;
};

const makePlane = (scene: Scene): Mesh => {
  const fuselage = CreateCylinder('fuselage', { height: 0.8, diameter: 0.14, tessellation: 8 }, scene);
  fuselage.rotation.x = HALF_PI;
  fuselage.position.z = -0.05;

  const nose = CreateCylinder('nose', { height: 0.35, diameterBottom: 0.14, diameterTop: 0, tessellation: 8 }, scene);
  nose.rotation.x = HALF_PI;
  nose.position.z = 0.525;

  const wingLeft = CreateBox('wingLeft', { width: 0.45, height: 0.03, depth: 0.22 }, scene);
  wingLeft.position.x = -0.26;
  const wingRight = CreateBox('wingRight', { width: 0.45, height: 0.03, depth: 0.22 }, scene);
  wingRight.position.x = 0.26;

  const tail = CreateBox('tail', { width: 0.35, height: 0.03, depth: 0.14 }, scene);
  tail.position.z = -0.42;

  return mergeParts('plane', [fuselage, nose, wingLeft, wingRight, tail], scene, new Color3(0.75, 0.75, 0.78));
};

const makeRocket = (scene: Scene): Mesh => {
  const body = CreateCylinder('body', { height: 1, diameter: 0.18, tessellation: 8 }, scene);
  body.rotation.x = HALF_PI;

  const nose = CreateCylinder('nose', { height: 0.3, diameterBottom: 0.18, diameterTop: 0, tessellation: 8 }, scene);
  nose.rotation.x = HALF_PI;
  nose.position.z = 0.65;

  const finDistance = 0.09 + 0.14;
  const fins = [0, (Math.PI * 2) / 3, (Math.PI * 4) / 3].map((angle, index) => {
    const fin = CreateBox(`fin${index}`, { width: 0.03, height: 0.28, depth: 0.22 }, scene);
    fin.position.y = finDistance;
    fin.position.z = -0.38;
    // Fins radiate around the body's Z axis, so they rotate about Z, not Y.
    fin.rotation.z = angle;
    return fin;
  });

  return mergeParts('rocket', [body, nose, ...fins], scene, new Color3(0.95, 0.95, 0.95));
};

const makeBoat = (scene: Scene): Mesh => {
  const hull = CreateBox('hull', { width: 0.3, height: 0.15, depth: 0.9 }, scene);
  const cabin = CreateBox('cabin', { width: 0.18, height: 0.14, depth: 0.28 }, scene);
  cabin.position.y = 0.075 + 0.07;
  cabin.position.z = -0.15;

  return mergeParts('boat', [hull, cabin], scene, new Color3(0.18, 0.22, 0.26));
};

const makeTank = (scene: Scene): Mesh => {
  const hull = CreateBox('hull', { width: 0.4, height: 0.2, depth: 0.7 }, scene);
  const turret = CreateBox('turret', { width: 0.25, height: 0.15, depth: 0.25 }, scene);
  turret.position.y = 0.1 + 0.075;

  const barrel = CreateCylinder('barrel', { height: 0.45, diameter: 0.05, tessellation: 8 }, scene);
  barrel.rotation.x = HALF_PI;
  barrel.position.y = turret.position.y;
  barrel.position.z = 0.125 + 0.225;

  return mergeParts('tank', [hull, turret, barrel], scene, new Color3(0.33, 0.36, 0.18));
};

const makeSatellite = (scene: Scene): Mesh => {
  const body = CreateBox('satBody', { size: 0.3 }, scene);
  const panelLeft = CreateBox('panelLeft', { width: 0.6, height: 0.02, depth: 0.25 }, scene);
  panelLeft.position.x = -(0.15 + 0.3);
  const panelRight = CreateBox('panelRight', { width: 0.6, height: 0.02, depth: 0.25 }, scene);
  panelRight.position.x = 0.15 + 0.3;

  return mergeParts('satellite', [body, panelLeft, panelRight], scene, new Color3(0.85, 0.65, 0.13));
};

/**
 * Builds a merged, flat-shaded, matte base mesh for one object kind, authored at roughly unit
 * scale with forward along +Z. Returned with `isVisible = false` since thin instances draw it.
 */
export const createObjectForm = (kind: TerraObject.Kind, scene: Scene): Mesh => {
  switch (kind) {
    case 'plane':
      return makePlane(scene);
    case 'rocket':
      return makeRocket(scene);
    case 'boat':
      return makeBoat(scene);
    case 'tank':
      return makeTank(scene);
    case 'satellite':
      return makeSatellite(scene);
  }
};
