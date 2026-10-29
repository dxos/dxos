//
// Copyright 2026 DXOS.org
//

import type { ManifoldToplevel } from 'manifold-3d';
import { beforeAll, describe, expect, test } from 'vitest';

import { type Resolved3D, type Scene, applyIntent, resolveLayout3D } from '@dxos/scene';

import { type Elements3D, evaluateSolid, solidVolume } from './solid.ts';

const scene = (elements: Resolved3D[]): Elements3D =>
  Object.fromEntries(elements.map((element) => [element.id, element]));

const box: Resolved3D = {
  id: 'box',
  kind: 'cube',
  center: { x: 0, y: 0, z: 0 },
  scale: { x: 2, y: 2, z: 2 },
  hidden: true,
};
const hole: Resolved3D = {
  id: 'hole',
  kind: 'cylinder',
  center: { x: 0, y: 0, z: 0 },
  scale: { x: 1, y: 3, z: 1 },
  hidden: true,
};

describe('evaluateSolid', () => {
  let wasm: ManifoldToplevel;

  beforeAll(async () => {
    const Module = await import('manifold-3d');
    wasm = await Module.default();
    wasm.setup();
  });

  test('difference has less volume than its first operand', () => {
    const record = scene([box, hole, { id: 'diff', kind: 'solid', props: { op: 'difference', operands: 'box hole' } }]);
    const volume = solidVolume(record, 'diff', wasm);
    expect(volume).toBeGreaterThan(0);
    expect(volume).toBeLessThan(8);
    expect(volume).toBeCloseTo(8 - Math.PI * 0.25 * 2, 1);
  });

  test('extruding +y by 0.5 adds width × depth × 0.5 of volume', () => {
    const record = scene([
      box,
      { id: 'top', kind: 'solid', props: { op: 'extrude', target: 'box', face: { x: 0, y: 1, z: 0 }, distance: 0.5 } },
    ]);
    expect(solidVolume(record, 'top', wasm)).toBeCloseTo(8 + 2 * 2 * 0.5, 3);
  });

  test('a missing operand returns an error', () => {
    const record = scene([box, { id: 'diff', kind: 'solid', props: { op: 'difference', operands: 'box missing' } }]);
    expect(evaluateSolid(record, 'diff', wasm)).toMatchObject({ error: expect.stringContaining('missing') });
  });

  test('a solid returns triangles', () => {
    const record = scene([box, hole, { id: 'diff', kind: 'solid', props: { op: 'difference', operands: 'box hole' } }]);
    const result = evaluateSolid(record, 'diff', wasm);
    expect('mesh' in result && result.mesh.indices.length % 3).toBe(0);
    expect('mesh' in result && result.mesh.positions.length).toBeGreaterThan(0);
  });
});

describe('evaluateSolid failures', () => {
  let wasm: ManifoldToplevel;

  beforeAll(async () => {
    const Module = await import('manifold-3d');
    wasm = await Module.default();
    wasm.setup();
  });

  test('a difference that removes everything is an error, not an empty mesh', () => {
    const record = scene([
      box,
      { ...box, id: 'big', scale: { x: 4, y: 4, z: 4 } },
      { id: 'diff', kind: 'solid', props: { op: 'difference', operands: 'box big' } },
    ]);
    expect(evaluateSolid(record, 'diff', wasm)).toMatchObject({ error: expect.stringContaining('empty') });
  });

  test('an operand of scale 0 is an error', () => {
    const record = scene([
      { ...box, scale: { x: 0, y: 0, z: 0 } },
      { id: 'u', kind: 'solid', props: { op: 'union', operands: 'box' } },
    ]);
    expect('error' in evaluateSolid(record, 'u', wasm)).toBe(true);
  });

  test('a solid over an element that places a library object evaluates that object, and follows edits to it', () => {
    const document = (scale: number): Scene.SceneDocument => {
      const layout: Scene.LayoutRecord3D = {
        id: 'l',
        dim: '3d',
        model: 'm',
        elements: {
          p: { id: 'p', object: 'part', center: { x: 0, y: 0, z: 0 } },
          q: { id: 'q', kind: 'cube', center: { x: 5, y: 0, z: 0 } },
        },
      };
      return {
        scenes: [],
        models: [
          {
            id: 'm',
            dim: '3d',
            objects: { part: { id: 'part', kind: 'cube', scale: { x: scale, y: scale, z: scale } } },
          },
        ],
        layouts: [applyIntent(layout, { kind: 'join', id: 'u', operands: ['p', 'q'] })],
      };
    };
    const volume = (doc: Scene.SceneDocument) => {
      const [layout] = doc.layouts;
      return layout.dim === '3d' ? solidVolume(resolveLayout3D(doc, layout), 'u', wasm) : Number.NaN;
    };
    expect(volume(document(2))).toBeCloseTo(8 + 1, 3);
    expect(volume(document(3))).toBeCloseTo(27 + 1, 3);
  });
});
