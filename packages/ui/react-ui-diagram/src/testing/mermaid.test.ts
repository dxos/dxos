//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { FLOWCHART } from './flowchart.ts';
import { projectMermaid } from './mermaid.ts';

describe('projectMermaid', () => {
  test('projects nodes, groups and containment', ({ expect }) => {
    const { graph } = projectMermaid(FLOWCHART);

    expect(graph.nodes.map((node) => node.id).sort()).toEqual(['A', 'B', 'C', 'CORE', 'X', 'Y']);
    // A group is a node whose kind is `group`, not a separate entity.
    expect(graph.nodes.find((node) => node.id === 'CORE')?.type).toBe('group');
    expect(graph.nodes.filter((node) => node.parent === 'CORE').map((node) => node.id)).toEqual(['A', 'B', 'C']);
    expect(graph.nodes.find((node) => node.id === 'X')?.parent).toBeUndefined();
  });

  test('a blank subgraph label yields no label rather than a quoted blank', ({ expect }) => {
    const { graph } = projectMermaid(FLOWCHART);

    expect(graph.nodes.find((node) => node.id === 'CORE')?.label).toBeUndefined();
  });

  test('projects edges including both directions of the cycle', ({ expect }) => {
    const { graph } = projectMermaid(FLOWCHART);

    expect(graph.edges.map((edge) => `${edge.source}->${edge.target}`)).toEqual([
      'A->B',
      'A->C',
      'X->A',
      'X->B',
      'X->C',
      'C->Y',
      'Y->C',
    ]);
  });

  test('binds edges to ports chosen by flow direction', ({ expect }) => {
    const down = projectMermaid('flowchart TB\nA --> B');
    expect(down.graph.edges[0]).toMatchObject({ sourcePort: 's', targetPort: 'n' });

    const across = projectMermaid('flowchart LR\nA --> B');
    expect(across.graph.edges[0]).toMatchObject({ sourcePort: 'e', targetPort: 'w' });
  });

  test('records provenance back to the source line', ({ expect }) => {
    const { provenance } = projectMermaid(FLOWCHART);

    // `Y[Y]` is declared on its own line, ahead of the edges that reference it.
    expect(provenance?.Y).toEqual({ line: 12 });
    expect(provenance?.CORE).toEqual({ line: 3 });
  });

  test('ignores comments and tolerates unknown syntax mid-keystroke', ({ expect }) => {
    const { graph } = projectMermaid(
      ['flowchart LR', '%% a comment', 'A[A]', 'A --> B', 'click A callback'].join('\n'),
    );

    expect(graph.nodes.map((node) => node.id)).toEqual(['A', 'B']);
    expect(graph.edges).toHaveLength(1);
  });

  test('a later explicit label wins over the first mention', ({ expect }) => {
    const { graph } = projectMermaid('flowchart TB\nA --> B\nB[Labelled]');

    expect(graph.nodes.find((node) => node.id === 'B')?.label).toBe('Labelled');
  });
});
