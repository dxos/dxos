//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Dsl } from '@dxos/diagram';
import { EXEMPLARS } from '@dxos/diagram/testing';
import { type Scene, resolveLayout3D } from '@dxos/scene';

import { project } from './camera.ts';
import { PIXELS_PER_UNIT, camera2DTo3D, flattenLayout, liftLayout, liftScene } from './lift.ts';
import { renderList } from './render-list.ts';

const viewport = { width: 800, height: 600 };

const lifted = (name: 'links' | 'subscene') => liftScene(Dsl.readScenes(EXEMPLARS[name]).document);

describe('liftScene', () => {
  test("an element right of the origin in 2D is at +x in 3D, sized by its object's size", () => {
    const doc = lifted('links');
    expect(doc.scenes[0].dim).toBe('3d');
    const layout = doc.layouts[0];
    const b = layout.dim === '3d' ? resolveLayout3D(doc, layout).b : undefined;
    expect(b).toMatchObject({ type: 'cube', center: { x: 256 / PIXELS_PER_UNIT, y: 0 } });
    expect(b?.scale?.x).toBeCloseTo(128 / PIXELS_PER_UNIT);
  });

  test("keeps links, labels and composites' parts", () => {
    const doc = lifted('subscene');
    expect(doc.layouts.map((layout) => layout.dim)).toEqual(['3d', '3d']);
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

describe('flattenLayout', () => {
  test('a 3D layout flattens to the 2D one its top-down view shows, and a lifted layout flattens back', () => {
    const layout: Scene.LayoutRecord3D = {
      id: 'l',
      dim: '3d',
      elements: {
        a: { id: 'a', type: 'cube', center: { x: 1, y: 0.5, z: -2 }, scale: { x: 2, y: 1, z: 1 } },
        s: { id: 's', type: 'sphere', center: { x: 0, y: 0, z: 0 } },
        ab: { id: 'ab', type: 'link', source: { node: 'a' }, target: { node: 's' } },
      },
    };
    const flat = flattenLayout(layout);
    expect(flat.dim).toBe('2d');
    expect(flat.elements.a).toMatchObject({
      type: 'rect',
      center: { x: 100, y: 200 },
      size: { width: 200, height: 100 },
    });
    expect(flat.elements.s).toMatchObject({
      type: 'ellipse',
      center: { x: 0, y: 0 },
      size: { width: 100, height: 100 },
    });
    expect(flat.elements.ab).toMatchObject({ type: 'link', source: { node: 'a' }, target: { node: 's' } });
    const again = flattenLayout(liftLayout(flat));
    expect(again.elements.a).toMatchObject({ center: { x: 100, y: 200 }, size: { width: 200, height: 100 } });
  });
});
