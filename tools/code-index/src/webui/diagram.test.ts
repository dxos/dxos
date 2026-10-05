//
// Copyright 2026 DXOS.org
//

import * as Result from 'effect/Result';
import { describe, test } from 'vitest';

import * as Diagram from '../workspace/Diagram.ts';
import { layout } from './diagram.ts';

describe('diagram', () => {
  test('lays a graph out as one object per node, a frame per group, plus the connectors', async ({ expect }) => {
    const graph = Result.getOrThrow(
      Diagram.fromValue({
        direction: 'LR',
        groups: [{ id: 'core', label: 'Core' }],
        nodes: [
          { id: '@dxos/alpha', label: 'Alpha', group: 'core' },
          { id: '@dxos/beta', label: 'Beta', group: 'core' },
        ],
        edges: [
          { from: '@dxos/alpha', to: '@dxos/beta', label: 'uses' },
          { from: '@dxos/beta', to: 'gamma' },
        ],
      }),
    );
    const objects = await layout(Diagram.toSource(graph));
    const labels = objects.flatMap((object) =>
      object.elements.flatMap((element) => ('text' in element ? [element.text] : [])),
    );
    expect(labels).toEqual(expect.arrayContaining(['Alpha', 'Beta', 'gamma', 'Core', 'uses']));
    const arrows = objects
      .find((object) => object.id === 'edges')
      ?.elements.filter((element) => element.kind === 'arrow');
    expect(arrows).toHaveLength(2);
    const ids = Diagram.objectIds(graph);
    expect(objects.map((object) => object.id)).toEqual(expect.arrayContaining([...ids.values(), 'group_core']));
  });

  test('routes candidates through `emitCandidate` when one is given', async ({ expect }) => {
    const graph = Result.getOrThrow(Diagram.fromMermaid('graph TD; A --> B --> C'));
    let routed = 0;
    const { MermaidEngine } = await import('@dxos/diagram');
    const objects = await layout(Diagram.toSource(graph), {
      emitCandidate: async (job) => {
        routed++;
        return MermaidEngine.emitJob(job);
      },
    });
    expect(routed).toBeGreaterThan(0);
    expect(objects.find((object) => object.id === 'edges')?.elements).toHaveLength(2);
  });
});
