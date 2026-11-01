//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Dsl } from '@dxos/diagram';
import { EXEMPLARS } from '@dxos/diagram/testing';
import { type Scene, applyIntent } from '@dxos/scene';

import {
  duplicateObject,
  hiddenElements,
  layersOf,
  layoutTree,
  mergedLayers,
  movedLayers,
  objectEntries,
  restackIntent,
  withoutHidden,
} from './scene-rows.ts';

const encapsulated = () => Dsl.readScenes(EXEMPLARS.encapsulated).document;

describe('scene rows', () => {
  test('the views tree is the scene layout, with a composite placing its parts read-only under it', () => {
    const doc = encapsulated();
    const tree = layoutTree(doc);
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

const box = (id: string, z: string, layer: string): Scene.Element2D => ({
  id,
  type: 'rect',
  center: { x: 0, y: 0 },
  size: { width: 10, height: 10 },
  z,
  layer,
});

const LAYERED: Scene.LayoutRecord2D = {
  id: 'L',
  dim: '2d',
  elements: { a: box('a', 'a', 'one'), b: box('b', 'b', 'two'), c: box('c', 'c', 'two') },
  layers: {
    one: { id: 'one', name: 'One', z: 'a' },
    two: { id: 'two', name: 'Two', z: 'b' },
    three: { id: 'three', name: 'Three', z: 'c' },
  },
};

describe('inspector edits on the document', () => {
  test('a layer moves to an index of the bottom-first order', () => {
    expect(movedLayers(layersOf(LAYERED), 'three', 0).map((layer) => layer.id)).toEqual(['three', 'one', 'two']);
    expect(movedLayers(layersOf(LAYERED), 'one', 2).map((layer) => layer.id)).toEqual(['two', 'three', 'one']);
  });

  test('merging moves the merged layers’ elements onto one layer and drops the others', () => {
    const { layers, intent } = mergedLayers(LAYERED, ['two', 'three'], 'one');
    expect(layers.map((layer) => layer.id)).toEqual(['one']);
    const merged = applyIntent(LAYERED, intent);
    expect(Object.values(merged.elements).map((element) => element.layer)).toEqual(['one', 'one', 'one']);
  });

  test('a restack draws the element just before or after its sibling', () => {
    const order = (record: Scene.LayoutRecord2D) =>
      Object.values(record.elements)
        .sort((left, right) => ((left.z ?? '') < (right.z ?? '') ? -1 : 1))
        .map((element) => element.id);
    expect(order(applyIntent(LAYERED, restackIntent(LAYERED, 'c', 'a', 'before')))).toEqual(['c', 'a', 'b']);
    expect(order(applyIntent(LAYERED, restackIntent(LAYERED, 'a', 'b', 'after')))).toEqual(['b', 'a', 'c']);
  });

  test('duplicating an object defines a copy under the next free id', () => {
    const doc: Scene.SceneDocument = {
      scenes: [],
      layouts: [],
      models: [{ id: 'm', dim: '2d', objects: { box: { id: 'box', type: 'rect', style: 'card' } } }],
    };
    expect(duplicateObject(doc, 'box')).toEqual({
      kind: 'define',
      model: 'm',
      object: { id: 'box-2', type: 'rect', style: 'card' },
    });
  });
});
