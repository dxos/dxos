//
// Copyright 2026 DXOS.org
//

import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { Scene } from '@babylonjs/core/scene';
import { afterAll, beforeAll, describe, test } from 'vitest';

import { Terra, TerraObject } from '#types';

import { type SimObject, evaluate, initialState } from '../sim/index.ts';
import { ExplosionLayer } from './explosion-layer.ts';

const config = Terra.toConfigValues(Terra.make({ config: { seed: 'explosion-1' } }));

const rocket = TerraObject.make({
  kind: 'rocket',
  speed: 0.02,
  source: { lat: 0, lng: 0, height: 0 },
  target: { lat: 0, lng: 90, height: 0 },
  spawnedAt: 0,
});

/** The rocket's own state at `elapsed`, which is what carries `explosion`. */
const at = (elapsed: number): SimObject => ({
  definition: rocket,
  state: evaluate(initialState(rocket, config), rocket, { config, elapsed }),
});

/** Its arc is a quarter turn walked at 0.02 rad/s. */
const IMPACT_SECONDS = Math.PI / 2 / 0.02;

describe('ExplosionLayer', () => {
  let engine: NullEngine;
  let scene: Scene;

  beforeAll(() => {
    engine = new NullEngine();
    scene = new Scene(engine);
  });

  afterAll(() => {
    scene.dispose();
    engine.dispose();
  });

  test('draws nothing while the rocket is still flying', ({ expect }) => {
    const drawn = drawOnce(at(IMPACT_SECONDS - 10));
    expect(drawn.visible).toEqual([false, false, false]);
    drawn.dispose();
  });

  test('draws concentric shells of decreasing opacity at the impact point', ({ expect }) => {
    const drawn = drawOnce(at(IMPACT_SECONDS + 0.2));
    expect(drawn.visible).toEqual([true, true, true]);
    expect(drawn.instances).toEqual([1, 1, 1]);
    expect(drawn.radii[0]).toBeLessThan(drawn.radii[1]);
    expect(drawn.radii[1]).toBeLessThan(drawn.radii[2]);
    expect(drawn.alphas[0]).toBeGreaterThan(drawn.alphas[1]);
    expect(drawn.alphas[1]).toBeGreaterThan(drawn.alphas[2]);
    drawn.dispose();
  });

  test('expands and fades as the blast burns', ({ expect }) => {
    const early = drawOnce(at(IMPACT_SECONDS + 0.2));
    early.dispose();
    const late = drawOnce(at(IMPACT_SECONDS + 1.5));
    late.radii.forEach((radius, index) => expect(radius).toBeGreaterThan(early.radii[index]));
    late.alphas.forEach((alpha, index) => expect(alpha).toBeLessThan(early.alphas[index]));
    late.dispose();
  });

  test('stops drawing once the blast has burnt out', ({ expect }) => {
    const drawn = drawOnce(at(IMPACT_SECONDS + 600));
    expect(drawn.visible).toEqual([false, false, false]);
    drawn.dispose();
  });

  /**
   * One layer's shells after a single `update`. Each case builds its own layer because Babylon only
   * rebuilds the world matrices a mesh reports inside `thinInstanceSetBuffer` — a second update at
   * the same instance count writes the buffer in place, which the GPU sees but a reader here would
   * not.
   */
  const drawOnce = (object: SimObject) => {
    const layer = new ExplosionLayer({ scene });
    layer.update([object]);
    // `scene.meshes` is typed as abstract; the thin-instance API this reads lives on `Mesh`.
    const meshes = scene.meshes.filter(
      (mesh): mesh is Mesh => mesh instanceof Mesh && mesh.name.startsWith('explosionShell'),
    );
    return {
      visible: meshes.map((mesh) => mesh.isVisible),
      instances: meshes.map((mesh) => mesh.thinInstanceCount),
      radii: meshes.map((mesh) => mesh.thinInstanceGetWorldMatrices()[0]?.getRow(0)?.length() ?? 0),
      alphas: meshes.map((mesh) => mesh.material?.alpha ?? 0),
      dispose: () => layer.dispose(),
    };
  };
});
