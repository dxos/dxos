//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { DEFAULT_INPUT, DEFAULT_OUTPUT } from '@dxos/conductor';
import { type CanvasBoard, type Polygon } from '@dxos/react-ui-canvas-editor';
import { type Link, type Node, type Scene, reduceIntent, sortByZ } from '@dxos/react-ui-canvas/scene';

import { applySceneToLayout, sceneFromLayout } from './echo-store.ts';

type Layout = { nodes: Polygon[]; edges: CanvasBoard.Connection[] };

const shape = (id: string, x: number, rest: Record<string, unknown> = {}): Polygon =>
  ({ id, type: 'constant', center: { x, y: 0 }, size: { width: 64, height: 32 }, ...rest }) as Polygon;

const edge = (id: string, source: string, target: string, rest: Record<string, unknown> = {}) =>
  ({ id, source, target, ...rest }) as CanvasBoard.Connection;

/** A board as the old editor left it: three shapes in paint order and one connection. */
const fixture = (): Layout => ({
  nodes: [shape('a', 0), shape('b', 100), shape('c', 200)],
  edges: [edge('a-b', 'a', 'b', { output: 'result', input: 'input' })],
});

describe('echo store', () => {
  test('a layout reads as a scene, taking z from array order', ({ expect }) => {
    const scene = sceneFromLayout('board', fixture());
    expect(Object.keys(scene.nodes)).toEqual(['a', 'b', 'c']);
    // The array order the editor painted in is the order the keys sort in.
    expect(sortByZ(Object.values(scene.nodes)).map(({ id }) => id)).toEqual(['a', 'b', 'c']);
    expect(scene.nodes.b.center).toEqual({ x: 100, y: 0 });
    expect(scene.nodes.b.size).toEqual({ width: 64, height: 32 });
  });

  test('an edge reads as a link whose ports are the anchor ids of its properties', ({ expect }) => {
    const scene = sceneFromLayout('board', fixture());
    const link = scene.links['a-b'];
    expect(link.source).toEqual({ node: 'a', port: 'output.result' });
    expect(link.target).toEqual({ node: 'b', port: 'input.input' });
    // The editor stored no link type; a curve is what it drew.
    expect(link.type).toBe('curve');
  });

  test('an edge with no properties falls back to the default input and output', ({ expect }) => {
    const scene = sceneFromLayout('board', { nodes: [shape('a', 0), shape('b', 1)], edges: [edge('e', 'a', 'b')] });
    expect(scene.links.e.source).toEqual({ node: 'a', port: `output.${DEFAULT_OUTPUT}` });
    expect(scene.links.e.target).toEqual({ node: 'b', port: `input.${DEFAULT_INPUT}` });
  });

  test('the editor style fields read as a node style, and a written style wins', ({ expect }) => {
    const scene = sceneFromLayout('board', {
      nodes: [shape('a', 0, { guide: true, classNames: 'text-red-500' }), shape('b', 1, { style: { hue: 'sky' } })],
      edges: [],
    });
    expect(scene.nodes.a.style).toEqual({ guide: true, className: 'text-red-500' });
    expect(scene.nodes.b.style).toEqual({ hue: 'sky' });
    expect('guide' in scene.nodes.a).toBe(false);
    expect('classNames' in scene.nodes.a).toBe(false);
  });

  test('a move writes back the node and nothing else', ({ expect }) => {
    const layout = fixture();
    const scene = sceneFromLayout('board', layout);
    const before = layout.nodes[0];
    const moved = reduceIntent(scene, { kind: 'move', ids: ['b'], delta: { x: 32, y: 16 } });
    applySceneToLayout(layout, moved);
    expect(layout.nodes.map(({ id }) => id)).toEqual(['a', 'b', 'c']);
    expect(layout.nodes[1].center).toEqual({ x: 132, y: 16 });
    // The untouched shapes are the same objects, so nothing else reaches the CRDT.
    expect(layout.nodes[0]).toBe(before);
  });

  test('create, link and delete reach the arrays', ({ expect }) => {
    const layout = fixture();
    let scene = sceneFromLayout('board', layout);
    const node: Node = {
      id: 'd',
      type: 'constant',
      z: 'z',
      center: { x: 300, y: 0 },
      size: { width: 64, height: 32 },
    };
    scene = reduceIntent(scene, { kind: 'create', node });
    const link = {
      id: 'c-d',
      type: 'line',
      z: 'z0',
      source: { node: 'c', port: 'output.result' },
      target: { node: 'd', port: 'input.input' },
    } as Link;
    scene = reduceIntent(scene, { kind: 'link', link });
    scene = reduceIntent(scene, { kind: 'delete', ids: ['a'] });
    applySceneToLayout(layout, scene);
    expect(layout.nodes.map(({ id }) => id)).toEqual(['b', 'c', 'd']);
    // Deleting `a` took its connection with it.
    expect(layout.edges.map(({ id }) => id)).toEqual(['c-d']);
    expect(layout.edges[0]).toMatchObject({ source: 'c', target: 'd', output: 'result', input: 'input' });
  });

  test('a reorder moves the shape in the array', ({ expect }) => {
    const layout = fixture();
    const scene = sceneFromLayout('board', layout);
    const top =
      sortByZ(Object.values(scene.nodes))
        .map(({ z }) => z)
        .at(-1) ?? '';
    applySceneToLayout(layout, reduceIntent(scene, { kind: 'reorder', id: 'a', z: `${top}5` }));
    expect(layout.nodes.map(({ id }) => id)).toEqual(['b', 'c', 'a']);
  });

  test('a scene round-trips through the layout unchanged', ({ expect }) => {
    const layout = fixture();
    const scene = sceneFromLayout('board', layout);
    applySceneToLayout(layout, scene);
    expect(sceneFromLayout('board', layout)).toEqual<Scene>(scene);
  });
});
