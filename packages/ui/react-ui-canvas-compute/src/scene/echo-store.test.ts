//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { DEFAULT_INPUT, DEFAULT_OUTPUT } from '@dxos/conductor';
import { sortByZ } from '@dxos/react-ui-canvas';
import { type NodeStyle, type Scene, applyIntent } from '@dxos/scene';

import { type ComputeShape } from '../shapes/index.ts';
import { type CanvasBoard } from '../types/index.ts';
import { type BoardLayout, boardLayout, writeBoardLayout } from './echo-store.ts';

const shape = (
  id: string,
  x: number,
  rest: Partial<ComputeShape> & { style?: NodeStyle; class?: string } = {},
): ComputeShape & { style?: NodeStyle } => ({
  id,
  type: 'constant',
  center: { x, y: 0 },
  size: { width: 64, height: 32 },
  ...rest,
});

const edge = (id: string, source: string, target: string, rest: Partial<CanvasBoard.Connection> = {}) => ({
  id,
  source,
  target,
  ...rest,
});

/** A board as the old editor left it: three shapes in paint order and one connection. */
const fixture = (): BoardLayout => ({
  nodes: [shape('a', 0), shape('b', 100), shape('c', 200)],
  edges: [edge('a-b', 'a', 'b', { output: 'result', input: 'input' })],
});

const ordered = (layout: Scene.LayoutRecord2D): string[] =>
  sortByZ(
    Object.values(layout.elements).flatMap(({ id, z }) => (z === undefined || id.includes('-') ? [] : [{ id, z }])),
  ).map(({ id }) => id);

describe('echo store', () => {
  test('a board reads as a 2D layout, taking z from array order', ({ expect }) => {
    const layout = boardLayout('board', fixture(), 'Board');
    expect(layout).toMatchObject({ id: 'board', dim: '2d', name: 'Board' });
    expect(ordered(layout)).toEqual(['a', 'b', 'c']);
    expect(layout.elements.b).toMatchObject({
      type: 'constant',
      center: { x: 100, y: 0 },
      size: { width: 64, height: 32 },
    });
  });

  test('a connection reads as a link element whose ports are the anchor ids of its properties', ({ expect }) => {
    const link = boardLayout('board', fixture()).elements['a-b'];
    expect(link).toMatchObject({
      type: 'link',
      source: { node: 'a', port: 'output.result' },
      target: { node: 'b', port: 'input.input' },
    });
    // The editor stored no link type; a curve with an arrow is what it drew.
    expect(link.props?.canvas).toEqual({ type: 'curve', ends: { end: 'arrow' } });
  });

  test('a connection with no properties falls back to the default input and output', ({ expect }) => {
    const layout = boardLayout('board', { nodes: [shape('a', 0), shape('b', 1)], edges: [edge('e', 'a', 'b')] });
    expect(layout.elements.e.source).toEqual({ node: 'a', port: `output.${DEFAULT_OUTPUT}` });
    expect(layout.elements.e.target).toEqual({ node: 'b', port: `input.${DEFAULT_INPUT}` });
  });

  test('the editor style fields read as overrides and a class as the named style; kind fields stay on top', ({
    expect,
  }) => {
    const layout = boardLayout('board', {
      nodes: [
        shape('a', 0, { guide: true, classNames: 'text-red-500', node: 'compute-a' }),
        shape('b', 1, { style: { hue: 'sky' }, class: 'accent' }),
      ],
      edges: [],
    });
    expect(layout.elements.a.overrides).toEqual({ guide: true });
    expect(layout.elements.b.overrides).toEqual({ hue: 'sky' });
    expect(layout.elements.b.style).toBe('accent');
    expect('guide' in layout.elements.a).toBe(false);
    expect(layout.elements.a).toMatchObject({ node: 'compute-a', classNames: 'text-red-500' });
  });

  test('a move intent writes back the moved shape and nothing else', ({ expect }) => {
    const board = fixture();
    const before = board.nodes[0];
    writeBoardLayout(
      board,
      applyIntent(boardLayout('board', board), { kind: 'move', ids: ['b'], delta: { x: 32, y: 16 } }),
    );
    expect(board.nodes.map(({ id }) => id)).toEqual(['a', 'b', 'c']);
    expect(board.nodes[1].center).toEqual({ x: 132, y: 16 });
    // The untouched shapes are the same objects, so nothing else reaches the CRDT.
    expect(board.nodes[0]).toBe(before);
  });

  test('create, bind and delete intents reach the arrays', ({ expect }) => {
    const board = fixture();
    const layout = applyIntent(boardLayout('board', board), {
      kind: 'batch',
      intents: [
        {
          kind: 'create',
          element: { id: 'd', type: 'constant', z: 'z', center: { x: 300, y: 0 }, size: { width: 64, height: 32 } },
        },
        {
          kind: 'bind',
          link: {
            id: 'c-d',
            type: 'link',
            z: 'z0',
            source: { node: 'c', port: 'output.result' },
            target: { node: 'd', port: 'input.input' },
          },
        },
        { kind: 'delete', ids: ['a'] },
      ],
    });
    writeBoardLayout(board, layout);
    expect(board.nodes.map(({ id }) => id)).toEqual(['b', 'c', 'd']);
    // Deleting `a` took its connection with it.
    expect(board.edges.map(({ id }) => id)).toEqual(['c-d']);
    expect(board.edges[0]).toMatchObject({ source: 'c', target: 'd', output: 'result', input: 'input' });
  });

  test('a reorder intent moves the shape in the array', ({ expect }) => {
    const board = fixture();
    const layout = boardLayout('board', board);
    const top = sortByZ(Object.values(layout.elements).flatMap(({ id, z }) => (z ? [{ id, z }] : []))).at(-1)?.z ?? '';
    writeBoardLayout(board, applyIntent(layout, { kind: 'reorder', id: 'a', order: `${top}5` }));
    expect(board.nodes.map(({ id }) => id)).toEqual(['b', 'c', 'a']);
  });

  test('a layout round-trips through the board unchanged', ({ expect }) => {
    const board = fixture();
    const layout = boardLayout('board', board);
    writeBoardLayout(board, layout);
    expect(boardLayout('board', board)).toEqual(layout);
  });
});
