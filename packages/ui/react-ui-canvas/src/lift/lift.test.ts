//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Dsl } from '@dxos/diagram';
import { EXEMPLARS } from '@dxos/diagram/testing';
import { type Scene, resolveLayout3D } from '@dxos/scene';

import { meshProps, project, renderList } from '../three/index.ts';
import { PIXELS_PER_UNIT, camera2DTo3D, flattenLayout, liftLayout, liftScene } from './lift.ts';

const viewport = { width: 800, height: 600 };

const lifted = (name: 'links' | 'subscene') => liftScene(Dsl.readScenes(EXEMPLARS[name]).document);

describe('liftScene', () => {
  test("an element right of the origin in 2D is at +x in 3D, sized by its object's size", () => {
    const doc = lifted('links');
    expect(doc.scenes[0].dim).toBe('3d');
    const layout = doc.layouts[0];
    const b = layout.dim === '3d' ? resolveLayout3D(doc, layout).b : undefined;
    expect(b).toMatchObject({ type: 'cube', center: { x: 192 / PIXELS_PER_UNIT, y: 0 } });
    expect(b?.scale?.x).toBeCloseTo(96 / PIXELS_PER_UNIT);
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

describe('a parametric shape', () => {
  const layout: Scene.LayoutRecord2D = {
    id: 'l',
    dim: '2d',
    elements: {
      arrow: {
        id: 'arrow',
        type: 'shape',
        center: { x: 100, y: 200 },
        size: { width: 200, height: 100 },
        props: { recipe: 'arrow', params: { head: 0.5 } },
      },
      box: { id: 'box', type: 'rect', center: { x: 0, y: 0 }, size: { width: 100, height: 100 } },
    },
  };

  test('lifts to a solid over its outline, sized by its frame, and keeps the recipe it was drawn from', () => {
    const { arrow, box } = liftLayout(layout).elements;
    expect(arrow).toMatchObject({
      type: 'mesh',
      center: { x: 1, z: -2 },
      scale: { x: 2, z: 1 },
      props: { recipe: 'arrow', params: { head: 0.5 } },
    });
    const mesh = meshProps(arrow.props);
    // An arrow's seven vertices, on a top ring and a bottom one.
    expect(mesh?.positions).toHaveLength(14 * 3);
    // The tip is half way down the right edge: +x, and z at the middle.
    expect(mesh?.positions.slice(3 * 3, 4 * 3)).toEqual([0.5, 0.5, 0]);
    // Any other kind lifts to its primitive, as before.
    expect(box.type).toBe('cube');
  });

  test('an element placing a shape object stands as its own outline, in its own frame and with its own parameters', () => {
    const doc: Scene.SceneDocument = {
      scenes: [],
      models: [
        {
          id: 'm',
          dim: '2d',
          objects: {
            arrow: { id: 'arrow', type: 'shape', size: { width: 200, height: 100 }, props: { recipe: 'arrow' } },
          },
        },
      ],
      layouts: [
        {
          id: 'l',
          dim: '2d',
          model: 'm',
          elements: {
            same: { id: 'same', object: 'arrow', center: { x: 0, y: 0 } },
            wide: { id: 'wide', object: 'arrow', center: { x: 0, y: 200 }, size: { width: 400, height: 100 } },
            long: { id: 'long', object: 'arrow', center: { x: 0, y: 400 }, props: { params: { head: 1 } } },
          },
        },
      ],
    };
    const lifted = liftScene(doc);
    const layout = lifted.layouts[0];
    const model = lifted.models[0];
    const object = model.dim === '3d' ? model.objects.arrow : undefined;
    expect(object?.type).toBe('mesh');
    // Where the head begins, as a share of the frame's width: the second vertex's x, from −0.5.
    const neck = (props: Scene.Element3D['props']) => (meshProps(props)?.positions[3] ?? 0) + 0.5;
    // The object's own outline: a 50 px head in a 200 px frame.
    expect(neck(object?.props)).toBeCloseTo(0.75);
    expect(neck(layout.elements.same.props)).toBeCloseTo(0.75);
    // Twice as wide, the head is still 50 px: a smaller share of the frame, which the object's solid would stretch.
    expect(neck(layout.elements.wide.props)).toBeCloseTo(0.875);
    // Its own parameter over the object's: a head as long as the frame is high.
    expect(neck(layout.elements.long.props)).toBeCloseTo(0.5);
    // Flattened, an element placing the object has no solid of its own again.
    const flat = flattenLayout(layout);
    expect(flat.elements.wide.props ?? {}).not.toHaveProperty('mesh');
    expect(flat.elements.long.props).toEqual({ params: { head: 1 } });
  });

  test('flattens back to the shape, without the solid it was stood up as', () => {
    const flat = flattenLayout(liftLayout(layout)).elements.arrow;
    expect(flat).toMatchObject({
      type: 'shape',
      center: { x: 100, y: 200 },
      size: { width: 200, height: 100 },
      props: { recipe: 'arrow', params: { head: 0.5 } },
    });
    expect(flat.props).not.toHaveProperty('mesh');
    // A mesh that never was a shape stays a mesh.
    const imported: Scene.LayoutRecord3D = {
      id: 'm',
      dim: '3d',
      elements: { taxi: { id: 'taxi', type: 'mesh', props: { mesh: { key: 'k', positions: [], indices: [] } } } },
    };
    expect(flattenLayout(imported).elements.taxi.type).toBe('mesh');
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
