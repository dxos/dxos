//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type NetworkTemplate, buildGraph, pack } from './model/index.ts';
import { createRandom } from './random.ts';
import { compile } from './timeline/index.ts';

const flow = (...steps: string[]) => ['flow R-1', '  steps:', ...steps].join('\n');
const simple: NetworkTemplate = {
  networks: [
    {
      id: 'a',
      kind: 'devices',
      nodes: [
        { id: 'p1', type: 'phone' },
        { id: 'p2', type: 'phone' },
      ],
    },
  ],
};

describe('review fixes', () => {
  test('a self-generating template is a diagnostic, not a crash', ({ expect }) => {
    const template: NetworkTemplate = {
      networks: [{ id: 'root', kind: 'cloud', generate: { networks: { template: 'A', count: [1, 1], depth: 2 } } }],
      templates: {
        A: { id: 'A', kind: 'servers', generate: { networks: { template: 'A', count: [1, 1], depth: 2 } } },
      },
    };
    const { diagnostics } = compile(flow('    - name: x', '      hold: 1s'), template);
    expect(
      diagnostics.some((diagnostic) => diagnostic.severity === 'error' && /nests deeper than/.test(diagnostic.message)),
    ).toBe(true);
    const huge: NetworkTemplate = {
      networks: [{ id: 'root', kind: 'cloud', generate: { networks: { template: 'B', count: [9, 9], depth: 8 } } }],
      templates: { B: { id: 'B', kind: 'servers' } },
    };
    expect(
      compile(flow('    - name: x', '      hold: 1s'), huge).diagnostics.some((diagnostic) =>
        /more than/.test(diagnostic.message),
      ),
    ).toBe(true);
  });

  test('layout of a 300-server network is fast', ({ expect }) => {
    const template: NetworkTemplate = {
      networks: [{ id: 'dc', kind: 'servers', generate: { nodes: { type: 'server', count: [300, 300] } } }],
    };
    const start = performance.now();
    buildGraph(template, 1);
    expect(performance.now() - start).toBeLessThan(400);
  });

  test('a huge pinned circle does not stall packing', ({ expect }) => {
    const start = performance.now();
    const { positions } = pack(
      [
        { key: 'big', radius: 1e6, at: [0, 0] },
        { key: 'small', radius: 10 },
      ],
      createRandom(1),
    );
    expect(performance.now() - start).toBeLessThan(500);
    const small = positions.small ?? [0, 0];
    expect(Math.hypot(small[0], small[1])).toBeGreaterThanOrEqual(1e6 + 10);
  });

  test('packets that start after the flow ends are reported', ({ expect }) => {
    const late = compile(
      flow(
        '    - name: a',
        '      camera: { fit: a, over: 2s }',
        '    - name: b',
        '      send: { from: a/p1, to: a/p2, rate: 2/s }',
      ),
      simple,
    );
    expect(late.diagnostics).toContainEqual({
      severity: 'warning',
      message: 'This send emits no packets before the flow ends',
      step: 'b',
    });
    const counted = compile(
      flow('    - name: a', '      send: { from: a/p1, to: a/p2, count: 5 }', '      hold: 1s'),
      simple,
    );
    expect(counted.diagnostics).toContainEqual({
      severity: 'warning',
      message: '4 of 5 packets start after the flow ends',
      step: 'a',
    });
  });
});
