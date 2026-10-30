//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Dsl } from '@dxos/diagram';
import { EXEMPLARS } from '@dxos/diagram/testing';

import { hiddenElements, layersOf, layoutTree3D, objectEntries, withoutHidden } from './inspectors-3d.ts';

const encapsulated = () => Dsl.readScenes(EXEMPLARS.encapsulated).document;

describe('3D inspectors', () => {
  test('the views tree is the scene layout, with a composite placing its parts read-only under it', () => {
    const doc = encapsulated();
    const tree = layoutTree3D(doc);
    expect(tree.kind).toBe('view');
    const shell = tree.children.find((row) => row.kind === 'instance');
    expect(shell).toBeDefined();
    expect(shell?.children.length).toBeGreaterThan(0);
    expect(shell?.children.every((row) => row.readonly)).toBe(true);
    expect(tree.children.some((row) => row.kind === 'link')).toBe(true);
  });

  test('objects list the model with how many elements place each', () => {
    const doc = encapsulated();
    const entries = objectEntries(doc);
    expect(entries.length).toBeGreaterThan(0);
    expect(entries.every((entry) => entry.instances >= 0 && entry.name === entry.id)).toBe(true);
    expect(entries.some((entry) => entry.instances > 0)).toBe(true);
  });

  test('a hidden layer hides the elements on it', () => {
    const layout = {
      id: 'l',
      dim: '3d' as const,
      layers: { a: { id: 'a', name: 'A', z: 'a0' }, b: { id: 'b', name: 'B', z: 'a1', hidden: true } },
      elements: {
        x: { id: 'x', type: 'cube', layer: 'a' },
        y: { id: 'y', type: 'cube', layer: 'b' },
        z: { id: 'z', type: 'cube' },
      },
    };
    expect(layersOf(layout).map((layer) => layer.id)).toEqual(['a', 'b']);
    expect([...hiddenElements(layout)]).toEqual(['y']);
  });

  test('a document without its hidden layers drops their elements and the links bound to them', () => {
    const doc = Dsl.readScenes(EXEMPLARS.links).document;
    const layout = doc.layouts[0];
    if (layout?.dim !== '2d') {
      throw new Error('expected a 2D layout');
    }
    const hidden = {
      ...doc,
      layouts: [
        {
          ...layout,
          layers: { h: { id: 'h', name: 'H', z: 'a0', hidden: true } },
          elements: { ...layout.elements, a: { ...layout.elements.a, layer: 'h' } },
        },
      ],
    };
    const shown = withoutHidden(hidden).layouts[0].elements;
    expect(Object.keys(shown).sort()).toEqual(['b', 'bc', 'c']);
    expect(withoutHidden(doc)).toBe(doc);
  });
});
