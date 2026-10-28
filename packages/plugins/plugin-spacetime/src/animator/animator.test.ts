//
// Copyright 2026 DXOS.org
//

import { ArcRotateCamera, Scene as BabylonScene, Matrix, NullEngine, Vector3 } from '@babylonjs/core';
import { describe, test } from 'vitest';

import { type ArrangeInput, compileScript, trackValue } from '@dxos/animation';
import { Obj, Ref } from '@dxos/echo';

import { Model, Scene } from '#types';

import { labelLayout, morphLayout, wordDiff } from './labels.ts';
import { containment, grid, orbit, packGeometry, ring } from './layouts.ts';
import { cameraOf, cameraPosition, defaultCamera, projectSphere } from './projection.ts';
import { labelMorphBeats } from './script.ts';
import { objectState, spacetimeStageBinding, spacetimeStageTargets } from './stage.ts';

const makeScene = () => {
  const ball = Model.make({ primitive: 'sphere', label: 'Ball', color: 'teal', scale: { x: 2, y: 2, z: 2 } });
  const box = Model.make({ primitive: 'cube', position: { x: 4, y: 0, z: 0 }, opacity: 0.5, labelStyle: 'hero' });
  const scene = Obj.make(Scene.Scene, {
    objects: [Ref.make(ball), Ref.make(box)],
    links: [{ id: 'ball-box', from: ball.id, to: box.id }],
  });
  return { scene, ball, box };
};

describe('spacetime stage', () => {
  test('targets are the objects, keyed by id, with their animatable properties and resting values', ({ expect }) => {
    const { scene, ball, box } = makeScene();
    const targets = spacetimeStageTargets(scene);
    expect(targets.map((target) => target.id)).toEqual([ball.id, box.id]);
    expect(Object.fromEntries(targets[0].properties.map(({ path, kind }) => [path, kind]))).toEqual({
      label: 'discrete',
      position: 'vec3',
      scale: 'vec3',
      rotation: 'rotation',
      color: 'color',
      opacity: 'number',
      labelStyle: 'discrete',
      labelFrom: 'discrete',
      labelMorph: 'number',
    });
    // A hue is resolved to hex, so a colour track interpolates in OKLab.
    expect(targets[0].values).toMatchObject({ color: '#1ab3b3', opacity: 1, label: 'Ball', labelStyle: 'plain' });
    expect(targets[1].values).toMatchObject({ opacity: 0.5, labelStyle: 'hero', label: '' });
  });

  test('binding: world positions, radius from size times sampled scale, opacity and colour from the sample', ({
    expect,
  }) => {
    const { scene, ball, box } = makeScene();
    const binding = spacetimeStageBinding(scene, {
      t: 1,
      values: { [ball.id]: { scale: { x: 3, y: 1, z: 1 }, opacity: 0.25, color: '#ff0000' } },
    });
    expect(binding.objects[ball.id]).toEqual({
      id: ball.id,
      position: { x: 0, y: 0, z: 0 },
      radius: 1.5,
      color: '#ff0000',
      opacity: 0.25,
    });
    expect(binding.objects[box.id]).toMatchObject({ radius: 0.5, opacity: 0.5 });
    expect(binding.links).toEqual([
      {
        id: 'ball-box',
        from: ball.id,
        to: box.id,
        points: [
          { x: 0, y: 0, z: 0 },
          { x: 4, y: 0, z: 0 },
        ],
      },
    ]);
  });

  test('a sampled state clamps opacity and falls back to the object for unkeyed properties', ({ expect }) => {
    const { box } = makeScene();
    const state = objectState(box, { opacity: 3, labelStyle: 'nonsense', position: { x: 1, y: 2, z: 3 } });
    expect(state).toMatchObject({ opacity: 1, labelStyle: 'plain', position: { x: 1, y: 2, z: 3 }, labelMorph: 1 });
  });
});

describe('projection', () => {
  test('the orbit camera sits where Babylon puts it, and projects as Babylon does', ({ expect }) => {
    const engine = new NullEngine({
      renderWidth: 800,
      renderHeight: 450,
      textureSize: 256,
      deterministicLockstep: false,
      lockstepMaxSteps: 1,
    });
    const scene = new BabylonScene(engine);
    const pose = { alpha: 0.7, beta: 1.1, radius: 25, target: { x: 1, y: -2, z: 3 } };
    const camera = new ArcRotateCamera('camera', pose.alpha, pose.beta, pose.radius, Vector3.Zero(), scene);
    camera.target = new Vector3(pose.target.x, pose.target.y, pose.target.z);
    camera.alpha = pose.alpha;
    camera.beta = pose.beta;
    camera.radius = pose.radius;
    camera.fov = 0.8;
    scene.activeCamera = camera;
    camera.getViewMatrix(true);

    const position = cameraPosition(pose);
    expect(position.x).toBeCloseTo(camera.position.x, 6);
    expect(position.y).toBeCloseTo(camera.position.y, 6);
    expect(position.z).toBeCloseTo(camera.position.z, 6);

    const viewport = { width: 800, height: 450 };
    const transform = camera.getViewMatrix().multiply(camera.getProjectionMatrix(true));
    for (const point of [
      { x: 0, y: 0, z: 0 },
      { x: 5, y: 1, z: -2 },
      { x: -3, y: 4, z: 6 },
    ]) {
      const expected = Vector3.Project(
        new Vector3(point.x, point.y, point.z),
        Matrix.Identity(),
        transform,
        camera.viewport.toGlobal(viewport.width, viewport.height),
      );
      const anchor = projectSphere(pose, viewport, point);
      expect(anchor?.x).toBeCloseTo(expected.x, 3);
      expect(anchor?.y).toBeCloseTo(expected.y, 3);
    }
    scene.dispose();
    engine.dispose();
  });

  test('a sphere at the target projects to the centre with a radius from its depth', ({ expect }) => {
    const pose = { alpha: -Math.PI / 2, beta: Math.PI / 2, radius: 10, target: { x: 0, y: 0, z: 0 } };
    const anchor = projectSphere(pose, { width: 200, height: 100 }, { x: 0, y: 0, z: 0 }, 1);
    expect(anchor?.x).toBeCloseTo(100);
    expect(anchor?.y).toBeCloseTo(50);
    expect(anchor?.radius).toBeCloseTo((1 / (10 * Math.tan(0.4))) * 50);
    // Behind the camera there is nothing to draw.
    expect(projectSphere(pose, { width: 200, height: 100 }, { x: 0, y: 0, z: -20 })).toBeUndefined();
  });

  test('the camera of a sample keeps beta off the poles and fills unset properties', ({ expect }) => {
    const camera = cameraOf({ beta: 0, radius: 7 });
    expect(camera.beta).toBeGreaterThan(0);
    expect(camera.radius).toBe(7);
    const { scene } = makeScene();
    expect(defaultCamera(scene).target).toEqual({ x: 2, y: 0, z: 0 });
  });
});

describe('layouts', () => {
  const input = (
    targets: string[],
    params: Record<string, unknown>,
    values: Record<string, Record<string, unknown>> = {},
  ): ArrangeInput => ({ targets, params, values: (target) => values[target] ?? {} });

  test('ring: evenly round the centre in the ground plane, from the start angle', ({ expect }) => {
    const positions = ring(input(['a', 'b', 'c', 'd'], { radius: 2, centre: { x: 1, y: 0, z: 0 } }));
    expect(positions.a).toEqual({ x: 3, y: 0, z: 0 });
    expect(positions.c).toMatchObject({ x: -1, y: 0 });
    expect((positions.b as { z: number }).z).toBeCloseTo(2);
  });

  test('orbit: round a centre target, a gap beyond its edge, leaving the centre in place', ({ expect }) => {
    const values = { sun: { position: { x: 10, y: 0, z: 0 }, scale: { x: 4, y: 4, z: 4 } } };
    const positions = orbit(input(['sun', 'a', 'b'], { centre: 'sun', gap: 1 }, values));
    expect(Object.keys(positions)).toEqual(['a', 'b']);
    expect(positions.a).toEqual({ x: 13, y: 0, z: 0 });
    expect((positions.b as { x: number }).x).toBeCloseTo(7);
  });

  test('grid: rows of columns about the centroid', ({ expect }) => {
    const positions = grid(input(['a', 'b', 'c', 'd'], { spacing: 2 }));
    expect(positions).toEqual({
      a: { x: -1, y: 0, z: -1 },
      b: { x: 1, y: 0, z: -1 },
      c: { x: -1, y: 0, z: 1 },
      d: { x: 1, y: 0, z: 1 },
    });
  });

  test('containment: members packed inside the container sphere', ({ expect }) => {
    const values = { box: { position: { x: 0, y: 0, z: 0 }, scale: { x: 20, y: 20, z: 20 } } };
    const positions = containment(input(['a', 'b', 'c'], { container: 'box' }, values));
    const { distance } = packGeometry(3, 10);
    for (const position of Object.values(positions)) {
      const { x, z } = position as { x: number; z: number };
      expect(Math.hypot(x, z)).toBeCloseTo(distance);
    }
    expect(containment(input(['a'], { container: 'box' }, values)).a).toEqual({ x: 0, y: 0, z: 0 });
  });
});

describe('labels', () => {
  const measure = (text: string) => text.length * 10;

  test('word diff finds the longest run both texts share', ({ expect }) => {
    expect(wordDiff('Frontier Labs', 'The Final Frontier')).toEqual({
      droppedBefore: [],
      addedBefore: ['The', 'Final'],
      kept: ['Frontier'],
      droppedAfter: ['Labs'],
      addedAfter: [],
    });
  });

  test('a morph slides the shared words: centred on the old text, then on the new', ({ expect }) => {
    const start = morphLayout('Frontier Labs', 'The Final Frontier', 0, measure);
    expect(start.width).toBe(measure('Frontier Labs'));
    const frontier = (layout: typeof start) => layout.words.find((word) => word.text === 'Frontier');
    expect(frontier(start)?.x).toBe(-start.width / 2);

    const end = morphLayout('Frontier Labs', 'The Final Frontier', 1, measure);
    expect(end.width).toBe(measure('The Final Frontier'));
    expect(frontier(end)?.x).toBe(end.width / 2 - measure('Frontier'));
    expect(end.words.find((word) => word.text === 'Labs')?.opacity).toBe(0);

    // Halfway, the added words are half visible and the shared word has moved part of the way.
    const middle = morphLayout('Frontier Labs', 'The Final Frontier', 0.5, measure);
    expect(middle.words.find((word) => word.text === 'The')?.opacity).toBe(0.5);
    expect(frontier(middle)?.x).toBeGreaterThan(frontier(start)?.x ?? 0);
    expect(frontier(middle)?.x).toBeLessThan(frontier(end)?.x ?? 0);
  });

  test('morph beats compile to a label that switches at once and a morph that eases over the slide', ({ expect }) => {
    const { timeline } = compileScript(
      labelMorphBeats({ target: 'lab', from: 'Frontier Labs', to: 'The Final Frontier', at: 1, duration: 2 }),
      { targets: { lab: { label: 'Frontier Labs', labelFrom: '', labelMorph: 1 } }, duration: 4 },
    );
    const at = (property: string, t: number) => trackValue(timeline.tracks[`lab:${property}`], t);
    expect(at('labelMorph', 0.5)).toBe(1);
    expect(at('label', 1.5)).toBe('The Final Frontier');
    expect(at('labelFrom', 1.5)).toBe('Frontier Labs');
    expect(at('labelMorph', 1.5)).toBeGreaterThan(0);
    expect(at('labelMorph', 1.5)).toBeLessThan(1);
    expect(at('labelMorph', 3.5)).toBe(1);
    const state = { label: 'The Final Frontier', labelFrom: 'Frontier Labs', labelMorph: 1 };
    expect(labelLayout(state, measure).words.map((word) => word.text)).toEqual(['The', 'Final', 'Frontier']);
  });
});
