//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { expand } from './expand.ts';
import { type NetworkTemplate } from './template.ts';

const TEMPLATE: NetworkTemplate = {
  networks: [
    {
      id: 'home',
      kind: 'devices',
      nodes: [
        { id: 'phone', type: 'phone', props: { app: 'chat' } },
        { id: 'laptop', type: 'laptop' },
      ],
    },
    {
      id: 'cloud',
      kind: 'cloud',
      generate: { nodes: { type: 'server', count: [2, 2] }, networks: { template: 'region', count: [2, 3], depth: 2 } },
    },
  ],
  templates: { region: { id: 'region', kind: 'servers', generate: { nodes: { type: 'server', count: [2, 4] } } } },
};

describe('expand', () => {
  test('builds paths, depth and counts deterministically', ({ expect }) => {
    const graph = expand(TEMPLATE, 7);
    expect(graph).toEqual(expand(TEMPLATE, 7));
    expect(graph.roots).toEqual(['home', 'cloud']);
    expect(graph.nodes['home/phone']).toMatchObject({ type: 'phone', network: 'home', props: { app: 'chat' } });
    expect(graph.networks.cloud?.nodes).toEqual(['cloud/server-1', 'cloud/server-2']);

    const regions = graph.networks.cloud?.networks ?? [];
    expect(regions.length >= 2 && regions.length <= 3).toBe(true);
    const nested = graph.networks['cloud/region-1']?.networks ?? [];
    expect(nested.length >= 2 && nested.length <= 3).toBe(true);
    expect(graph.networks['cloud/region-1/region-1']).toMatchObject({
      depth: 2,
      parent: 'cloud/region-1',
      kind: 'servers',
    });
    expect(graph.networks['cloud/region-1/region-1']?.networks).toEqual([]);
    for (const path of graph.networks['cloud/region-1/region-1']?.nodes ?? []) {
      expect(path.startsWith('cloud/region-1/region-1/server-')).toBe(true);
    }
  });

  test('rejects duplicate ids and unknown templates', ({ expect }) => {
    expect(() =>
      expand(
        {
          networks: [
            { id: 'a', kind: 'devices' },
            { id: 'a', kind: 'devices' },
          ],
        },
        0,
      ),
    ).toThrow(/Duplicate network "a"/);
    expect(() =>
      expand(
        {
          networks: [{ id: 'a', kind: 'cloud', generate: { networks: { template: 'nope', count: [1, 1], depth: 1 } } }],
        },
        0,
      ),
    ).toThrow(/Unknown template "nope"/);
  });
});
