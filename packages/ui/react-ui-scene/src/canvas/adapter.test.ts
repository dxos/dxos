//
// Copyright 2026 DXOS.org
//

import * as Registry from 'effect/reactivity/AtomRegistry';
import { describe, expect, test } from 'vitest';

import { Dsl } from '@dxos/diagram';
import { EXEMPLAR_NAMES, EXEMPLARS } from '@dxos/diagram/testing';
import { MAJOR_GRID } from '@dxos/react-ui-canvas';

import { toCanvasViews } from './adapter.ts';

const views = (text: string) => toCanvasViews(Dsl.readScenes(text).document);

describe('toCanvasViews', () => {
  test('maps a link to a line link between the bound nodes', () => {
    const {
      views: [root],
    } = views(EXEMPLARS.links);
    expect(root.links.ab).toMatchObject({
      type: 'line',
      source: { node: 'a' },
      target: { node: 'b' },
      ends: { end: 'arrow' },
    });
    expect(root.nodes.a).toMatchObject({ type: 'rect', label: 'A', style: { hue: 'blue', fill: true, border: true } });
  });

  test("maps a composite element to a view node over its parts layout's view", () => {
    const { views: all, root } = views(EXEMPLARS.subscene);
    expect(root).toBe('main');
    expect(all.find((view) => view.id === 'main')?.nodes.b).toMatchObject({ type: 'view', scene: 'b-detail' });
    expect(all.map((view) => view.id)).toContain('b-detail');
  });

  test("an element placing an object draws with the object's kind and size", () => {
    const {
      views: [root],
    } = views(EXEMPLARS.links);
    expect(root.nodes.b).toMatchObject({ type: 'rect', size: { width: 128, height: 128 }, style: { hue: 'green' } });
  });

  test('skips a link whose binding is missing', () => {
    const {
      views: [root],
    } = toCanvasViews({
      scenes: [{ id: 's', dim: '2d', layout: 'l', camera: { center: { x: 0, y: 0 }, zoom: 1 } }],
      layouts: [
        {
          id: 'l',
          dim: '2d',
          elements: { ab: { id: 'ab', kind: 'link', from: { element: 'a' }, to: { element: 'b' } } },
        },
      ],
      models: [],
    });
    expect(root.links).toEqual({});
  });

  test('makes a store the canvas reads', () => {
    const { store, root } = views(EXEMPLARS.links);
    expect(Registry.make().get(store.view(root))?.nodes.c).toBeDefined();
  });

  test('puts every edge of every 2D exemplar node on a major grid line', () => {
    const offGrid = EXEMPLAR_NAMES.flatMap((name) =>
      toCanvasViews(Dsl.readScenes(EXEMPLARS[name]).document)
        .views.flatMap((view) => Object.values(view.nodes))
        .filter((node) =>
          [
            node.center.x - node.size.width / 2,
            node.center.x + node.size.width / 2,
            node.center.y - node.size.height / 2,
            node.center.y + node.size.height / 2,
          ].some((edge) => edge % MAJOR_GRID !== 0),
        )
        .map((node) => `${name}/${node.id}`),
    );
    expect(offGrid).toEqual([]);
  });
});
