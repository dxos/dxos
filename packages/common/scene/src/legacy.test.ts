//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Obj, Type } from '@dxos/echo';

import * as Legacy from './legacy.ts';
import * as Scene from './Scene.ts';
import { StyleCatalog } from './style.ts';

describe('legacy', () => {
  test('each stored type migrates from its own name at the version before', () => {
    const pairs = [
      [Legacy.Layout2D, Scene.Layout2D],
      [Legacy.Layout3D, Scene.Layout3D],
      [Legacy.Model2D, Scene.Model2D],
      [Legacy.Model3D, Scene.Model3D],
      [Legacy.StyleCatalog, StyleCatalog],
    ] as const;
    for (const [from, to] of pairs) {
      expect(Type.getTypename(from)).toBe(Type.getTypename(to));
      expect([Type.getVersion(from), Type.getVersion(to)]).toEqual(['0.1.0', '0.2.0']);
    }
    expect(Legacy.Migrations).toHaveLength(pairs.length);
  });

  test('a 2D layout is rewritten in the current words, and is a current layout', () => {
    const stored = Obj.make(Legacy.Layout2D, {
      key: 'main',
      name: 'Main',
      grid: 12,
      elements: {
        a: {
          id: 'a',
          type: 'rect',
          z: 'a0',
          center: { x: 0, y: 0 },
          size: { width: 96, height: 48 },
          style: 'warn',
          overrides: { hue: 'red', tone: 1, rounded: false },
          props: { canvas: { ports: [{ id: 'out', side: 'e', offset: 0.5 }] } },
        },
        window: { id: 'window', type: 'frame', z: 'a1', center: { x: 0, y: 0 }, size: { width: 9, height: 9 } },
        polygon: {
          id: 'polygon',
          type: 'polygon',
          z: 'a2',
          center: { x: 0, y: 0 },
          size: { width: 9, height: 9 },
          props: { canvas: { sides: 5, fit: 'circle' } },
        },
        l: {
          id: 'l',
          type: 'link',
          z: 'a3',
          source: { node: 'a', port: 'out' },
          target: { node: 'window' },
          label: 'opens',
          props: { canvas: { type: 'ortho', ends: { end: 'arrow' } } },
        },
      },
      styles: { warn: { hue: 'amber', fill: false } },
      constraints: [{ subject: 'a', relation: 'west', object: 'window' }],
    });
    const { id: _id, ...upgraded } = Legacy.upgradeLayout2D(stored);
    expect(upgraded.elements).toEqual({
      a: {
        id: 'a',
        kind: 'rect',
        z: 'a0',
        center: { x: 0, y: 0 },
        size: { width: 96, height: 48 },
        style: 'warn',
        overrides: { color: 'red/1', corners: 'none' },
        ports: [{ id: 'out', x: 1, y: 0.5, side: 'right' }],
      },
      window: { id: 'window', kind: 'view', z: 'a1', center: { x: 0, y: 0 }, size: { width: 9, height: 9 } },
      polygon: {
        id: 'polygon',
        kind: 'polygon',
        z: 'a2',
        center: { x: 0, y: 0 },
        size: { width: 9, height: 9 },
        params: { sides: 5, fit: 'circle' },
      },
      l: {
        id: 'l',
        kind: 'link',
        path: 'ortho',
        z: 'a3',
        source: { node: 'a', port: 'out' },
        target: { node: 'window' },
        label: 'opens',
        head: 'arrow',
      },
    });
    expect(upgraded.styles).toEqual({ warn: { color: 'amber', fill: 'none' } });
    expect(upgraded.constraints).toEqual([{ subject: 'a', relation: 'left-of', object: 'window' }]);
    expect(upgraded.grid).toBe(12);
    const layout = Obj.make(Scene.Layout2D, upgraded);
    expect(Object.keys(layout.elements)).toEqual(['a', 'window', 'polygon', 'l']);
  });

  test('a model and a catalog take the current words', () => {
    const model = Obj.make(Legacy.Model2D, {
      key: 'm',
      objects: { box: { id: 'box', type: 'rect', overrides: { hue: 'blue', border: false } } },
      styles: { warn: { name: 'Warn', hue: 'amber', tone: 3 } },
    });
    const { id: _model, ...upgraded } = Legacy.upgradeModel2D(model);
    expect(upgraded.objects).toEqual({
      box: { id: 'box', kind: 'rect', overrides: { color: 'blue', stroke: 'none' } },
    });
    expect(upgraded.styles).toEqual({ warn: { name: 'Warn', color: 'amber/3' } });
    expect(Obj.make(Scene.Model2D, upgraded).objects.box.kind).toBe('rect');

    const catalog = Obj.make(Legacy.StyleCatalog, {
      key: 'brand',
      name: 'Brand',
      dim: '3d',
      styles: { glass: { hue: 'sky', surface: 'glass', metalness: 0.2 } },
    });
    const { id: _catalog, ...current } = Legacy.upgradeStyleCatalog(catalog);
    expect(current.styles).toEqual({ glass: { color: 'sky', fill: 'glass', metalness: 0.2 } });
    expect(Obj.make(StyleCatalog, current).key).toBe('brand');
  });

  test('a record no schema takes is left out, and a field no schema takes is dropped from its record', () => {
    const stored = Obj.make(Legacy.Layout3D, {
      key: 'space',
      elements: {
        bad: { type: 'cube' },
        cube: { id: 'cube', type: 'cube', overrides: { hue: 'Not A Colour', opacity: 0.5 } },
      },
    });
    expect(Legacy.upgradeLayout3D(stored).elements).toEqual({
      cube: { id: 'cube', kind: 'cube' },
    });
  });
});
