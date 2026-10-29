//
// Copyright 2026 DXOS.org
//

import * as Registry from 'effect/reactivity/AtomRegistry';
import { describe, expect, test } from 'vitest';

import { Dsl } from '@dxos/diagram';
import { EXEMPLARS, EXEMPLAR_NAMES } from '@dxos/diagram/testing';
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

  test('maps a scene element to a view node over the child view', () => {
    const { views: all, root } = views(EXEMPLARS.subscene);
    expect(root).toBe('subscene');
    expect(all.find((view) => view.id === 'subscene')?.nodes.b).toMatchObject({ type: 'view', scene: 'b-detail' });
    expect(all.map((view) => view.id)).toContain('b-detail');
  });

  test('skips a link whose binding is missing', () => {
    const {
      views: [root],
    } = toCanvasViews({
      scenes: [
        {
          id: 's',
          dim: '2d',
          camera: { center: { x: 0, y: 0 }, zoom: 1 },
          elements: { ab: { id: 'ab', kind: 'link', from: { element: 'a' }, to: { element: 'b' } } },
        },
      ],
    });
    expect(root.links).toEqual({});
  });

  test('makes a store the canvas reads', () => {
    const { store, root } = views(EXEMPLARS.links);
    expect(Registry.make().get(store.view(root))?.nodes.c).toBeDefined();
  });

  test('puts every edge of every 2D exemplar node on a major grid line', () => {
    const offGrid = EXEMPLAR_NAMES.flatMap((name) =>
      Dsl.readScenes(EXEMPLARS[name])
        .document.scenes.filter((scene) => scene.dim === '2d')
        .flatMap((scene) => Object.values(toCanvasViews({ scenes: [scene] }).views[0].nodes))
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
