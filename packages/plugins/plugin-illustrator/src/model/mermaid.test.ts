//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { compile, parse } from './mermaid';
import type * as Scene from './scene';

/** Exercises node declarations, a labelled-blank subgraph, fan-out, and a `C <-> Y` cycle. */
export const FLOWCHART = `
flowchart TB
    X[X]

    subgraph CORE[" "]
        A[A]
        B[B]
        C[C]

        A --> B
        A --> C
    end

    Y[Y]

    X --> A
    X --> B
    X --> C
    C --> Y
    Y --> C
`;

const objectsOf = (commands: Scene.Command[]) =>
  commands.flatMap((command) => (command.op === 'upsert-object' ? [command.object] : []));

describe('mermaid', () => {
  test('parses nodes, subgraph membership and edges', ({ expect }) => {
    const graph = parse(FLOWCHART);

    expect(graph.direction).toBe('TB');
    expect(graph.nodes.map((node) => node.id).sort()).toEqual(['A', 'B', 'C', 'X', 'Y']);
    expect(graph.groups.map((group) => group.id)).toEqual(['CORE']);
    expect(graph.groups[0].children.sort()).toEqual(['A', 'B', 'C']);
    // Nodes declared outside the subgraph carry no group.
    expect(graph.nodes.find((node) => node.id === 'X')?.group).toBeUndefined();
    expect(graph.nodes.find((node) => node.id === 'A')?.group).toBe('CORE');
    expect(graph.edges.map((edge) => `${edge.from}->${edge.to}`)).toEqual([
      'A->B',
      'A->C',
      'X->A',
      'X->B',
      'X->C',
      'C->Y',
      'Y->C',
    ]);
  });

  test('compiles to one object per node plus a frame and an edge object', ({ expect }) => {
    const objects = objectsOf(compile(FLOWCHART));

    expect(objects.map((object) => object.id)).toEqual(['CORE', 'X', 'A', 'B', 'C', 'Y', 'edges']);
    // Every node is a single labelled box; the label is the mermaid text, not the id.
    for (const id of ['X', 'A', 'B', 'C', 'Y']) {
      const [element] = objects.find((object) => object.id === id)!.elements;
      expect(element).toMatchObject({ kind: 'rect', id: 'box', text: id });
    }
    // The blank subgraph label yields a frame with no text.
    const frame = objects.find((object) => object.id === 'CORE')!.elements[0];
    expect(frame).toMatchObject({ kind: 'rect', id: 'frame', stroke: 'dashed' });
    expect(frame).not.toHaveProperty('text');
  });

  test('ranks nodes by longest path and breaks the C/Y cycle', ({ expect }) => {
    const objects = objectsOf(compile(FLOWCHART));
    const y = (id: string) => objects.find((object) => object.id === id)!.origin!.y;

    // X feeds everything, so it leads; B and C sit past A because the longest path wins over the
    // direct X edge. `Y --> C` is a back edge and must not push C below Y.
    expect(y('X')).toBeLessThan(y('A'));
    expect(y('A')).toBeLessThan(y('B'));
    expect(y('A')).toBeLessThan(y('C'));
    expect(y('B')).toBe(y('C'));
    expect(y('C')).toBeLessThan(y('Y'));
  });

  test('binds arrows to node boxes, including both directions of the cycle', ({ expect }) => {
    const edges = objectsOf(compile(FLOWCHART)).find((object) => object.id === 'edges')!;
    const refs = edges.elements.map((element) => (element.kind === 'arrow' ? `${element.from}->${element.to}` : ''));

    expect(refs).toContain('C/box->Y/box');
    expect(refs).toContain('Y/box->C/box');
    expect(edges.elements.every((element) => element.kind === 'arrow')).toBe(true);
  });

  test('frame encloses its members', ({ expect }) => {
    const objects = objectsOf(compile(FLOWCHART));
    const core = objects.find((object) => object.id === 'CORE')!;
    const frame = core.elements[0] as Scene.Box;

    for (const id of ['A', 'B', 'C']) {
      const node = objects.find((object) => object.id === id)!;
      expect(node.origin!.x).toBeGreaterThanOrEqual(core.origin!.x);
      expect(node.origin!.y).toBeGreaterThanOrEqual(core.origin!.y);
      expect(node.origin!.x).toBeLessThanOrEqual(core.origin!.x + frame.w);
      expect(node.origin!.y).toBeLessThanOrEqual(core.origin!.y + frame.h);
    }
  });

  test('ignores comments and tolerates unknown syntax', ({ expect }) => {
    const graph = parse(['flowchart LR', '%% a comment', 'A[A]', 'A --> B', 'click A callback'].join('\n'));

    expect(graph.direction).toBe('LR');
    expect(graph.nodes.map((node) => node.id)).toEqual(['A', 'B']);
    expect(graph.edges).toEqual([{ from: 'A', to: 'B' }]);
  });
});
