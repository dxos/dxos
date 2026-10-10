//
// Copyright 2026 DXOS.org
//

import * as Result from 'effect/Result';
import { describe, test } from 'vitest';

import * as Diagram from '../workspace/Diagram.ts';
import { layout } from './diagram.ts';

describe('diagram', () => {
  test('lays DSL out as one object per node and group, plus the connectors, keeping refs', async ({ expect }) => {
    const source = Result.getOrThrow(
      Diagram.fromValue({
        flow: 'right',
        groups: [{ id: 'core', label: 'Core' }],
        nodes: [
          { id: 'alpha', label: 'Alpha', group: 'core', ref: 'https://dxos.org/deus/package/alpha' },
          { id: 'beta', label: 'Beta', group: 'core' },
        ],
        edges: [
          { from: 'alpha', to: 'beta', label: 'uses' },
          { from: 'beta', to: 'gamma', relation: 'depends-on' },
        ],
      }),
    );
    const objects = await layout(source);
    const labels = objects.flatMap((object) =>
      object.elements.flatMap((element) => ('text' in element && element.text ? [element.text] : [])),
    );
    expect(labels).toEqual(expect.arrayContaining(['Alpha', 'Beta', 'gamma', 'Core', 'uses']));
    const arrows = objects
      .find((object) => object.id === 'edges')
      ?.elements.filter((element) => element.kind === 'arrow');
    expect(arrows).toHaveLength(2);
    expect(objects.find((object) => object.id === 'alpha')?.ref).toEqual('https://dxos.org/deus/package/alpha');
  });

  test('lays out a large graph', async ({ expect }) => {
    const groups = ['a', 'b', 'c', 'd'];
    const nodes = groups.flatMap((group) =>
      Array.from({ length: 8 }, (_, index) => ({ id: `${group}${index}`, group })),
    );
    const edges = nodes.slice(1).map((node, index) => ({ from: nodes[Math.floor(index / 2)].id, to: node.id }));
    const objects = await layout(
      Result.getOrThrow(Diagram.fromValue({ groups: groups.map((id) => ({ id })), nodes, edges })),
    );
    expect(objects.filter((object) => nodes.some((node) => node.id === object.id))).toHaveLength(nodes.length);
  }, 120_000);
});
