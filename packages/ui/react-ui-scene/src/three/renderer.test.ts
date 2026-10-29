//
// Copyright 2026 DXOS.org
//

import { NullEngine } from '@babylonjs/core';
import { describe, expect, test } from 'vitest';

import { type Scene } from '@dxos/scene';

import { renderList } from './render-list.ts';
import { SceneRenderer3D, itemSignature } from './renderer.ts';

describe('itemSignature', () => {
  test('new geometry of the same size rebuilds the mesh', () => {
    const spec = { color: '#000000', kind: 'standard' as const, alpha: 1, edges: false };
    const mesh = () => ({ positions: new Float32Array(9), indices: new Uint32Array(3) });
    expect(itemSignature('solid', spec, mesh())).not.toBe(itemSignature('solid', spec, mesh()));
    const same = mesh();
    expect(itemSignature('solid', spec, same)).toBe(itemSignature('solid', spec, same));
  });
});

describe('SceneRenderer3D.pick', () => {
  const CAMERA: Scene.Camera3D = {
    target: { x: 0, y: 0, z: 0 },
    yaw: 0,
    pitch: 30,
    distance: 10,
    fov: 0.8,
    projection: 'perspective',
  };

  const doc = (elements: Scene.Element3D[], extra: Partial<Scene.SceneDocument> = {}): Scene.SceneDocument => ({
    scenes: [{ id: 's', dim: '3d', layout: 'root', camera: CAMERA }],
    layouts: [
      { id: 'root', dim: '3d', elements: Object.fromEntries(elements.map((element) => [element.id, element])) },
      ...(extra.layouts ?? []),
    ],
    models: extra.models ?? [],
  });

  const renderer = (document: Scene.SceneDocument) => {
    const engine = new NullEngine({
      renderWidth: 800,
      renderHeight: 600,
      textureSize: 256,
      deterministicLockstep: false,
      lockstepMaxSteps: 1,
    });
    const view = new SceneRenderer3D({ engine, theme: 'cad', background: '#ffffff', selection: '#ff8800' });
    view.render(renderList(document), CAMERA);
    return view;
  };

  test('selecting outlines the item by its silhouette, and deselecting removes it', () => {
    const view = renderer(
      doc([
        { id: 'a', kind: 'cube', center: { x: 0, y: 0, z: 0 } },
        { id: 'b', kind: 'sphere', center: { x: 3, y: 0, z: 0 } },
      ]),
    );
    view.select(['a']);
    expect(view.highlighted).toEqual(['a']);
    view.select(['b']);
    expect(view.highlighted).toEqual(['b']);
    view.select([]);
    expect(view.highlighted).toEqual([]);
    view.dispose();
  });

  test('a selected item gets a world-aligned box of its bounds in the selection colour, removed on deselect', () => {
    const view = renderer(doc([{ id: 'a', kind: 'cube', center: { x: 1, y: 2, z: 3 }, scale: { x: 2, y: 4, z: 6 } }]));
    view.select(['a']);
    const box = view.boxes.a;
    expect(box?.color).toBe('#ff8800');
    expect(box?.min.x).toBeCloseTo(0);
    expect(box?.max.x).toBeCloseTo(2);
    expect(box?.min.y).toBeCloseTo(0);
    expect(box?.max.y).toBeCloseTo(4);
    expect(box?.min.z).toBeCloseTo(0);
    expect(box?.max.z).toBeCloseTo(6);
    expect(view.highlightColor).toBe('#ff8800');
    view.select([]);
    expect(view.boxes).toEqual({});
    view.select(['a']);
    view.dispose();
    expect(view.boxes).toEqual({});
  });

  test('with snapping on, a gizmo moves by the grid unit, turns by 15 degrees and scales by a tenth; off, freely', () => {
    const view = renderer(doc([{ id: 'a', kind: 'cube', center: { x: 0, y: 0, z: 0 } }]));
    view.setSnap(true);
    view.attachGizmo('a', 'move', () => {});
    expect(view.gizmoSnap).toEqual({ move: 1, rotate: 15, scale: 0.1 });
    view.setSnap(false);
    expect(view.gizmoSnap).toEqual({ move: 0, rotate: 0, scale: 0 });
    view.dispose();
  });

  test('the ground grid is hidden until shown, and hides again', () => {
    const view = renderer(doc([{ id: 'a', kind: 'cube', center: { x: 0, y: 0, z: 0 } }]));
    expect(view.grid).toBe(false);
    view.setGrid(true);
    expect(view.grid).toBe(true);
    view.setGrid(false);
    expect(view.grid).toBe(false);
    view.dispose();
  });

  test('the ground grid is never picked', () => {
    const view = renderer(doc([{ id: 'a', kind: 'cube', center: { x: 20, y: 0, z: 0 } }]));
    view.setGrid(true);
    expect(view.pick({ x: 400, y: 300 }).item).toBeUndefined();
    view.dispose();
  });

  test('the screen centre over a cube at the origin picks its key', () => {
    const view = renderer(doc([{ id: 'a', kind: 'cube', center: { x: 0, y: 0, z: 0 } }]));
    expect(view.pick({ x: 400, y: 300 })).toMatchObject({ item: 'a' });
    view.dispose();
  });

  test('empty space picks only a ground point', () => {
    const view = renderer(doc([{ id: 'a', kind: 'cube', center: { x: 20, y: 0, z: 0 } }]));
    const hit = view.pick({ x: 400, y: 300 });
    expect(hit.item).toBeUndefined();
    expect(hit.point?.y).toBeCloseTo(0);
    view.dispose();
  });

  test('through a composite frame, an element of its parts picks its composite/element key', () => {
    const document = doc([{ id: 'a', object: 'box', center: { x: 0, y: 0, z: 0 }, scale: { x: 3, y: 3, z: 3 } }], {
      layouts: [{ id: 'inside', dim: '3d', elements: { b: { id: 'b', kind: 'cube', center: { x: 0, y: 0, z: 0 } } } }],
      models: [{ id: 'm', dim: '3d', objects: { box: { id: 'box', kind: 'sphere', parts: 'inside' } } }],
    });
    const withModel: Scene.SceneDocument = {
      ...document,
      layouts: document.layouts.map((layout) => (layout.id === 'root' ? { ...layout, model: 'm' } : layout)),
    };
    const view = renderer(withModel);
    expect(view.pick({ x: 400, y: 300 })).toMatchObject({ item: 'a' });
    expect(view.pick({ x: 400, y: 300 }, { through: true })).toMatchObject({ item: 'a/b' });
    view.dispose();
  });

  test('each renderer draws its gizmos on a layer of its own, which outlives another renderer', () => {
    const elements: Scene.Element3D[] = [{ id: 'a', kind: 'cube', center: { x: 0, y: 0, z: 0 } }];
    const first = renderer(doc(elements));
    const second = renderer(doc(elements));
    first.attachGizmo('a', 'move', () => {});
    second.attachGizmo('a', 'move', () => {});
    expect(first.gizmoLayer).toBeDefined();
    expect(first.gizmoLayer).not.toBe(second.gizmoLayer);
    second.dispose();
    expect(first.gizmoLayer?.utilityLayerScene.isDisposed).toBe(false);
    first.dispose();
  });
});
