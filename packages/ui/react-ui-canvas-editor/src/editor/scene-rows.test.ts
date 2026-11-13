//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Dsl } from '@dxos/diagram';
import { EXEMPLARS } from '@dxos/diagram/testing';
import { type Scene, applyIntent, findLayout } from '@dxos/scene';

import {
  duplicateObject,
  hiddenElements,
  layersOf,
  layoutTree,
  mergedLayers,
  movedLayers,
  objectEntries,
  restackIntent,
  selectedElement,
  withoutHidden,
} from './scene-rows.ts';

const encapsulated = () => Dsl.readScenes(EXEMPLARS.encapsulated).document;

describe('scene rows', () => {
  test('the views tree is the scene layout: a portal is a View row with its full path, and a composite opens on its own', () => {
    const tree = layoutTree(encapsulated());
    expect(tree).toMatchObject({ kind: 'view', path: ['system'] });
    expect(tree.children.some((row) => row.kind === 'link')).toBe(true);
    // `shell` places `team`, whose parts are a plain View: the row opens that View, below the root.
    const shell = tree.children.find((row) => row.element === 'shell');
    expect(shell).toMatchObject({ kind: 'view', path: ['system', 'cluster'], container: 'system' });
    expect(shell?.children.every((row) => !row.readonly && row.path.join() === 'system,cluster')).toBe(true);
    // The ring group is a composite: its parts are read-only where it is placed and edited in it, opened on its own.
    const team = shell?.children.find((row) => row.element === 'team');
    expect(team).toMatchObject({ kind: 'instance', path: ['system', 'cluster'], container: 'cluster' });
    expect(team?.children.length).toBeGreaterThan(0);
    for (const part of team?.children ?? []) {
      expect(part).toMatchObject({ readonly: true, object: { path: ['cluster/team'], isolate: 'cluster/team' } });
    }
  });

  test("a part of an Object edited in place is found in the Object's definition, where it is stored", () => {
    const doc = encapsulated();
    const cluster = findLayout(doc, 'cluster');
    const parts = findLayout(doc, 'cluster/team');
    const [part] = Object.keys(parts?.elements ?? {});
    expect(part).toBeDefined();
    // The part is drawn in `cluster`, which places the Object, but is not one of that layout's own elements.
    expect(cluster?.elements[part]).toBeUndefined();
    const selected = cluster && selectedElement(doc, cluster, part);
    expect(selected && [selected.element.id, selected.layout]).toEqual([part, 'cluster/team']);
    // An element of the layout itself, and an id nothing has.
    expect(cluster && selectedElement(doc, cluster, 'team')?.layout).toBe('cluster');
    expect(cluster && selectedElement(doc, cluster, 'none')).toBeUndefined();
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
