//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Dsl } from '@dxos/diagram';
import { EXEMPLARS } from '@dxos/diagram/testing';
import { type Scene } from '@dxos/scene';

import { project } from './camera.ts';
import { PIXELS_PER_UNIT, camera2DTo3D, liftScene } from './lift.ts';
import { renderList } from './render-list.ts';

const viewport = { width: 800, height: 600 };

const lifted = (name: 'links' | 'subscene') => liftScene(Dsl.readScenes(EXEMPLARS[name]).document);

describe('liftScene', () => {
  test('an element right of the origin in 2D is at +x in 3D', () => {
    const scene = lifted('links').scenes[0];
    expect(scene.dim).toBe('3d');
    const b = scene.dim === '3d' ? scene.elements.b : undefined;
    expect(b).toMatchObject({ kind: 'cube', center: { x: 256 / PIXELS_PER_UNIT, y: 0 } });
    expect(b?.scale?.x).toBeCloseTo(128 / PIXELS_PER_UNIT);
  });

  test('keeps links, labels and child scenes', () => {
    const doc = lifted('subscene');
    expect(doc.scenes.map((scene) => scene.dim)).toEqual(['3d', '3d']);
    const list = renderList(doc);
    expect(list.links.map((link) => link.key)).toEqual(expect.arrayContaining(['ab', 'bc', 'b/xy']));
    expect(list.items.find((item) => item.key === 'a')?.label).toBe('A');
  });

  test('the top-down camera frames the 2D view: 100px apart stays 100px apart, and down stays down', () => {
    const camera: Scene.Camera2D = { center: { x: 0, y: 0 }, zoom: 1 };
    const view = camera2DTo3D(camera, viewport);
    const at = (x: number, y: number) =>
      project(view, viewport, { x: x / PIXELS_PER_UNIT, y: 0, z: -y / PIXELS_PER_UNIT });
    expect(at(0, 0)?.x).toBeCloseTo(400);
    expect(at(0, 0)?.y).toBeCloseTo(300);
    expect(at(100, 0)?.x).toBeCloseTo(500, 0);
    expect(at(0, 100)?.y).toBeCloseTo(400, 0);
  });
});
