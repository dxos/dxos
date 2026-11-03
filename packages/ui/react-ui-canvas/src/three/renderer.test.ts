//
// Copyright 2026 DXOS.org
//

import { NullEngine } from '@babylonjs/core';
import { describe, expect, test } from 'vitest';

import { type Scene } from '@dxos/scene';

import { NEU_PALETTE } from '../model/index.ts';
import { GROUND_PLANE, planeThrough } from './plane.ts';
import { renderList } from './render-list.ts';
import { SceneRenderer3D, castsNeuShadow, itemSignature } from './renderer.ts';

describe('itemSignature', () => {
  test('new geometry of the same size rebuilds the mesh', () => {
    const spec = { color: '#000000', kind: 'standard' as const, alpha: 1, edges: false };
    const mesh = () => ({ positions: new Float32Array(9), indices: new Uint32Array(3) });
    expect(itemSignature('solid', spec, mesh())).not.toBe(itemSignature('solid', spec, mesh()));
    const same = mesh();
    expect(itemSignature('solid', spec, same)).toBe(itemSignature('solid', spec, same));
  });
});

describe('SceneRenderer3D neu', () => {
  const engine = () =>
    new NullEngine({
      renderWidth: 800,
      renderHeight: 600,
      textureSize: 256,
      deterministicLockstep: false,
      lockstepMaxSteps: 1,
    });

  test('the ground is the 2D Neu ground of the mode, under the lowest item', () => {
    const camera: Scene.Camera3D = {
      target: { x: 0, y: 0, z: 0 },
      yaw: 0,
      pitch: 30,
      distance: 10,
      fov: 0.8,
      projection: 'perspective',
    };
    const document: Scene.SceneDocument = {
      scenes: [{ id: 's', dim: '3d', layout: 'root', camera }],
      layouts: [
        {
          id: 'root',
          dim: '3d',
          elements: { a: { id: 'a', type: 'cube', center: { x: 0, y: 1, z: 0 }, scale: { x: 2, y: 2, z: 2 } } },
        },
      ],
      models: [],
    };
    for (const [theme, mode] of [
      ['neu-light', 'light'],
      ['neu-dark', 'dark'],
    ] as const) {
      const view = new SceneRenderer3D({ engine: engine(), theme, background: '#ffffff' });
      view.render(renderList(document), camera);
      expect(view.background).toBe(NEU_PALETTE[mode].ground);
      expect(view.groundLevel).toBeCloseTo(0);
      view.dispose();
    }
    // Other looks draw no ground of their own.
    const cad = new SceneRenderer3D({ engine: engine(), theme: 'cad', background: '#ffffff' });
    expect(cad.groundLevel).toBeUndefined();
    cad.dispose();
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
        { id: 'a', type: 'cube', center: { x: 0, y: 0, z: 0 } },
        { id: 'b', type: 'sphere', center: { x: 3, y: 0, z: 0 } },
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
    const view = renderer(doc([{ id: 'a', type: 'cube', center: { x: 1, y: 2, z: 3 }, scale: { x: 2, y: 4, z: 6 } }]));
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

  test("a selected item's box follows it when it moves, and keeps to the new selection colour", () => {
    const cube = (x: number): Scene.Element3D => ({ id: 'a', type: 'cube', center: { x, y: 0, z: 0 } });
    const view = renderer(doc([cube(0)]));
    view.select(['a']);
    expect(view.boxes.a?.min.x).toBeCloseTo(-0.5);
    view.render(renderList(doc([cube(3)])), CAMERA);
    expect(view.boxes.a?.min.x).toBeCloseTo(2.5);
    view.setSelectionColor('#00ff00');
    expect(view.boxes.a?.color).toBe('#00ff00');
    view.dispose();
  });

  test('intersecting or coplanar items never cut into the outline: only selected items reach its mask', () => {
    const view = renderer(
      doc([
        { id: 'a', type: 'cube', center: { x: 0, y: 0, z: 0 } },
        { id: 'b', type: 'cube', center: { x: 0.5, y: 0, z: 0.5 } },
      ]),
    );
    view.setGrid(true);
    view.select(['a']);
    expect(view.outlineOccluders).toEqual([]);
    view.select(['b']);
    expect(view.outlineOccluders).toEqual([]);
    view.dispose();
  });

  test('a selected box is drawn over the scene, so a face it lies on cannot stripe it', () => {
    const view = renderer(
      doc([
        { id: 'a', type: 'cube', center: { x: 0, y: 0, z: 0 } },
        { id: 'b', type: 'cube', center: { x: 1, y: 0, z: 0 } },
      ]),
    );
    view.select(['a']);
    expect(view.boxes.a?.onTop).toBe(true);
    view.dispose();
  });

  test("a selected face is drawn over that side of the item's bounds in the selection colour, and cleared", () => {
    const view = renderer(doc([{ id: 'a', type: 'cube', center: { x: 1, y: 2, z: 3 }, scale: { x: 2, y: 4, z: 6 } }]));
    view.selectFace('a', { x: 1, y: 0, z: 0 });
    expect(view.face?.key).toBe('a');
    expect(view.face?.center.x).toBeCloseTo(2);
    expect(view.face?.center.y).toBeCloseTo(2);
    expect(view.face?.center.z).toBeCloseTo(3);
    expect(view.face?.color).toBe('#ff8800');
    view.selectFace(undefined);
    expect(view.face).toBeUndefined();
    view.selectFace('a', { x: 0, y: -1, z: 0 });
    expect(view.face?.center.y).toBeCloseTo(0);
    view.dispose();
    expect(view.face).toBeUndefined();
  });

  test("a hovered face is outlined round that side of the item's bounds, a closed loop, and cleared", () => {
    const view = renderer(doc([{ id: 'a', type: 'cube', center: { x: 1, y: 2, z: 3 }, scale: { x: 2, y: 4, z: 6 } }]));
    view.hoverFace('a', { x: 1, y: 0, z: 0 });
    const outline = view.hoveredFace?.outline.map(({ x, y, z }) =>
      [x, y, z].map((value) => Math.round(value * 100) / 100),
    );
    expect(view.hoveredFace?.key).toBe('a');
    expect(outline).toHaveLength(5);
    expect(outline?.[0]).toEqual(outline?.[4]);
    expect(new Set(outline?.map(([x]) => x))).toEqual(new Set([2]));
    expect(new Set(outline?.map(([, y, z]) => `${y},${z}`))).toEqual(new Set(['0,0', '4,0', '4,6', '0,6']));
    view.hoverFace(undefined);
    expect(view.hoveredFace).toBeUndefined();
    view.hoverFace('a', { x: 0, y: 1, z: 0 });
    view.dispose();
    expect(view.hoveredFace).toBeUndefined();
  });

  test('with snapping on, a gizmo moves by the minor grid unit, turns by 15 degrees and scales by a tenth; off, freely', () => {
    const view = renderer(doc([{ id: 'a', type: 'cube', center: { x: 0, y: 0, z: 0 } }]));
    view.setSnap(true);
    view.attachGizmo('a', 'move', () => {});
    expect(view.gizmoSnap).toEqual({ move: 0.25, rotate: 15, scale: 0.1 });
    view.setSnap(false);
    expect(view.gizmoSnap).toEqual({ move: 0, rotate: 0, scale: 0 });
    view.dispose();
  });

  test("an item's extent along an axis is its world size that way; an item not drawn has none", () => {
    const view = renderer(doc([{ id: 'a', type: 'cube', center: { x: 0, y: 0, z: 0 }, scale: { x: 2, y: 4, z: 6 } }]));
    expect(view.extent('a', { x: 0, y: 1, z: 0 })).toBeCloseTo(4);
    expect(view.extent('a', { x: 0, y: 0, z: -1 })).toBeCloseTo(6);
    expect(view.extent('missing', { x: 1, y: 0, z: 0 })).toBeUndefined();
    view.dispose();
  });

  test('a scale gizmo on an item whose aspect is locked offers only its even handle; otherwise every axis', () => {
    const view = renderer(doc([{ id: 'a', type: 'cube', center: { x: 0, y: 0, z: 0 } }]));
    view.attachGizmo('a', 'scale', () => {}, { uniform: true });
    expect(view.scaleAxes).toBe(false);
    view.attachGizmo('a', 'scale', () => {});
    expect(view.scaleAxes).toBe(true);
    view.dispose();
  });

  test('the ground grid is hidden until shown, and hides again', () => {
    const view = renderer(doc([{ id: 'a', type: 'cube', center: { x: 0, y: 0, z: 0 } }]));
    expect(view.grid).toBe(false);
    view.setGrid(true);
    expect(view.grid).toBe(true);
    view.setGrid(false);
    expect(view.grid).toBe(false);
    view.dispose();
  });

  test('the axes are hidden until shown, and hide again', () => {
    const view = renderer(doc([{ id: 'a', type: 'cube', center: { x: 0, y: 0, z: 0 } }]));
    expect(view.axes).toBe(false);
    view.setAxes(true);
    expect(view.axes).toBe(true);
    view.setAxes(false);
    expect(view.axes).toBe(false);
    view.dispose();
  });

  test('the ground grid is never picked', () => {
    const view = renderer(doc([{ id: 'a', type: 'cube', center: { x: 20, y: 0, z: 0 } }]));
    view.setGrid(true);
    expect(view.pick({ x: 400, y: 300 }).item).toBeUndefined();
    view.dispose();
  });

  test('the screen centre over a cube at the origin picks its key', () => {
    const view = renderer(doc([{ id: 'a', type: 'cube', center: { x: 0, y: 0, z: 0 } }]));
    expect(view.pick({ x: 400, y: 300 })).toMatchObject({ item: 'a' });
    view.dispose();
  });

  test('empty space picks a point on the work plane, which is the ground until it moves', () => {
    const view = renderer(doc([{ id: 'a', type: 'cube', center: { x: 20, y: 0, z: 0 } }]));
    expect(view.plane).toEqual(GROUND_PLANE);
    view.setPlane(planeThrough(GROUND_PLANE, { x: 0, y: -2, z: 0 }));
    expect(view.pick({ x: 400, y: 300 }).point?.y).toBeCloseTo(-2);
    view.dispose();
  });

  test("an item's bounds and the middle of one of its faces, in the world; an item not drawn has none", () => {
    const view = renderer(doc([{ id: 'a', type: 'cube', center: { x: 1, y: 2, z: 3 }, scale: { x: 2, y: 4, z: 6 } }]));
    const round = (point?: Scene.Vec3) => point && [point.x, point.y, point.z].map((value) => Number(value.toFixed(2)));
    expect(round(view.bounds('a')?.min)).toEqual([0, 0, 0]);
    expect(round(view.bounds('a')?.max)).toEqual([2, 4, 6]);
    expect(round(view.faceCenter('a', { x: 0, y: 1, z: 0 }))).toEqual([1, 4, 3]);
    expect(round(view.faceCenter('a', { x: -1, y: 0, z: 0 }))).toEqual([0, 2, 3]);
    expect(view.bounds('missing')).toBeUndefined();
    view.dispose();
  });

  test("every other item's world bounds, for snapping a moving one against", () => {
    const view = renderer(
      doc([
        { id: 'a', type: 'cube', center: { x: 0, y: 0.5, z: 0 } },
        { id: 'b', type: 'cube', center: { x: 3, y: 0.5, z: 0 } },
      ]),
    );
    const boxes = view.itemBounds(['a']);
    expect(Object.keys(boxes)).toEqual(['b']);
    expect(boxes.b.min.x).toBeCloseTo(2.5);
    expect(boxes.b.max.y).toBeCloseTo(1);
    view.dispose();
  });

  test("a moving composite's parts and the frame round a moving part are not bounds to snap against", () => {
    const document = doc(
      [
        { id: 'a', object: 'box', center: { x: 0, y: 0, z: 0 }, scale: { x: 3, y: 3, z: 3 } },
        { id: 'c', type: 'cube', center: { x: 5, y: 0, z: 0 } },
      ],
      {
        layouts: [
          { id: 'inside', dim: '3d', elements: { b: { id: 'b', type: 'cube', center: { x: 0, y: 0, z: 0 } } } },
        ],
        models: [{ id: 'm', dim: '3d', objects: { box: { id: 'box', type: 'sphere', parts: 'inside' } } }],
      },
    );
    const view = renderer({
      ...document,
      layouts: document.layouts.map((layout) => (layout.id === 'root' ? { ...layout, model: 'm' } : layout)),
    });
    expect(Object.keys(view.itemBounds(['a'])).sort()).toEqual(['c']);
    expect(Object.keys(view.itemBounds(['a/b'])).sort()).toEqual(['c']);
    view.dispose();
  });

  test('a pick can skip items, so a drag sees what lies behind the bodies it moves', () => {
    const view = renderer(
      doc([
        { id: 'front', type: 'cube', center: { x: 0, y: 0, z: 0 } },
        { id: 'back', type: 'cube', center: { x: 0, y: -2, z: 0 }, scale: { x: 6, y: 1, z: 6 } },
      ]),
    );
    // The camera looks down at the front cube, and past it onto the broad back one below.
    const through = view.pick({ x: 400, y: 300 }, { skip: ['front'] });
    expect(view.pick({ x: 400, y: 300 }).item).toBe('front');
    expect(through.item).toBe('back');
    expect(view.pick({ x: 400, y: 300 }, { skip: ['front', 'back'] }).item).toBeUndefined();
    view.dispose();
  });

  test('a snapped point is marked in the snap colour, and an axis a drag is held to is drawn in its colour; both clear', () => {
    const view = renderer(doc([{ id: 'a', type: 'cube', center: { x: 0, y: 0, z: 0 } }]));
    view.snapPoint({ x: 1, y: 2, z: 3 });
    expect(view.snappedPoint).toEqual({ x: 1, y: 2, z: 3 });
    view.snapPoint(undefined);
    expect(view.snappedPoint).toBeUndefined();
    view.showAxisGuide({ origin: { x: 1, y: 0.5, z: 0 }, axis: 'z' });
    expect(view.axisGuide).toEqual({ origin: { x: 1, y: 0.5, z: 0 }, axis: 'z', color: '#3e63dd' });
    view.showAxisGuide(undefined);
    expect(view.axisGuide).toBeUndefined();
    view.snapPoint({ x: 0, y: 0, z: 0 });
    view.dispose();
    expect(view.snappedPoint).toBeUndefined();
  });

  test('faces a move is flush with are drawn in the snap colour, apart from the selected face, and cleared', () => {
    const engine = new NullEngine({
      renderWidth: 800,
      renderHeight: 600,
      textureSize: 256,
      deterministicLockstep: false,
      lockstepMaxSteps: 1,
    });
    const view = new SceneRenderer3D({ engine, theme: 'cad', background: '#ffffff', snap: '#f59e0b' });
    view.render(renderList(doc([{ id: 'b', type: 'cube', center: { x: 3, y: 0.5, z: 0 } }])), CAMERA);
    expect(view.snapped).toEqual([]);
    view.snapFaces([{ key: 'b', normal: { x: -1, y: 0, z: 0 } }]);
    expect(view.snapped).toEqual([{ key: 'b', normal: { x: -1, y: 0, z: 0 }, color: '#f59e0b' }]);
    view.setSnapColor('#00ff00');
    expect(view.snapped[0]?.color).toBe('#00ff00');
    view.snapFaces([]);
    expect(view.snapped).toEqual([]);
    view.dispose();
  });

  test('the face arrow stands where it is put, along its face, and hides', () => {
    const view = renderer(doc([{ id: 'a', type: 'cube', center: { x: 0, y: 0, z: 0 } }]));
    expect(view.faceArrow).toBeUndefined();
    view.showFaceArrow({ point: { x: 0, y: 0.5, z: 0 }, normal: { x: 0, y: 1, z: 0 } });
    expect(view.faceArrow).toEqual({ point: { x: 0, y: 0.5, z: 0 }, normal: { x: 0, y: 1, z: 0 } });
    view.showFaceArrow({ point: { x: -0.5, y: 0, z: 0 }, normal: { x: -1, y: 0, z: 0 } });
    expect(view.faceArrow).toEqual({ point: { x: -0.5, y: 0, z: 0 }, normal: { x: -1, y: 0, z: 0 } });
    view.showFaceArrow(undefined);
    expect(view.faceArrow).toBeUndefined();
    view.dispose();
  });

  test('empty space picks only a ground point', () => {
    const view = renderer(doc([{ id: 'a', type: 'cube', center: { x: 20, y: 0, z: 0 } }]));
    const hit = view.pick({ x: 400, y: 300 });
    expect(hit.item).toBeUndefined();
    expect(hit.point?.y).toBeCloseTo(0);
    view.dispose();
  });

  test('through a composite frame, an element of its parts picks its composite/element key', () => {
    const document = doc([{ id: 'a', object: 'box', center: { x: 0, y: 0, z: 0 }, scale: { x: 3, y: 3, z: 3 } }], {
      layouts: [{ id: 'inside', dim: '3d', elements: { b: { id: 'b', type: 'cube', center: { x: 0, y: 0, z: 0 } } } }],
      models: [{ id: 'm', dim: '3d', objects: { box: { id: 'box', type: 'sphere', parts: 'inside' } } }],
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
    const elements: Scene.Element3D[] = [{ id: 'a', type: 'cube', center: { x: 0, y: 0, z: 0 } }];
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

describe('SceneRenderer3D neu ground', () => {
  const engine = () =>
    new NullEngine({
      renderWidth: 800,
      renderHeight: 600,
      textureSize: 256,
      deterministicLockstep: false,
      lockstepMaxSteps: 1,
    });

  const camera: Scene.Camera3D = {
    target: { x: 0, y: 0, z: 0 },
    yaw: 0,
    pitch: 30,
    distance: 10,
    fov: 0.8,
    projection: 'perspective',
  };
  const sceneOf = (elements: Record<string, Scene.Element3D>): Scene.SceneDocument => ({
    scenes: [{ id: 's', dim: '3d', layout: 'root', camera }],
    layouts: [{ id: 'root', dim: '3d', elements }],
    models: [],
  });

  test('the ground lies under the lowest solid body, not a see-through shell round it', () => {
    const document = sceneOf({
      shell: {
        id: 'shell',
        type: 'sphere',
        center: { x: 0, y: 0, z: 0 },
        scale: { x: 8, y: 8, z: 8 },
        overrides: { surface: 'glass' },
      },
      body: { id: 'body', type: 'cube', center: { x: 0, y: -1, z: 0 }, scale: { x: 1, y: 1, z: 1 } },
    });
    const view = new SceneRenderer3D({ engine: engine(), theme: 'neu-dark', background: '#ffffff' });
    view.render(renderList(document), camera);
    // Under the cube's foot at -1.5, not the shell's at -4.
    expect(view.groundLevel).toBeCloseTo(-1.5, 1);
    view.dispose();
  });

  test('Neu Light keeps the light ground under a dark app, and Neu Dark the dark under a light one', () => {
    const light = new SceneRenderer3D({ engine: engine(), theme: 'neu-light', mode: 'dark', background: '#ffffff' });
    expect(light.background).toBe(NEU_PALETTE.light.ground);
    light.dispose();
    const dark = new SceneRenderer3D({ engine: engine(), theme: 'neu-dark', mode: 'light', background: '#ffffff' });
    expect(dark.background).toBe(NEU_PALETTE.dark.ground);
    dark.dispose();
  });

  test('only solid bodies cast a contact shadow', () => {
    const body = { color: '#000000', kind: 'neu' as const, alpha: 1, edges: true };
    expect(castsNeuShadow(body, {})).toBe(true);
    expect(castsNeuShadow({ ...body, alpha: 0.4 }, {})).toBe(false);
    expect(castsNeuShadow(body, { frame: true })).toBe(false);
    expect(castsNeuShadow({ ...body, kind: 'standard' }, {})).toBe(false);
  });
});
