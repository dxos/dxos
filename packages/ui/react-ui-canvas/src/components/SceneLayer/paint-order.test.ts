//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type Node } from '@dxos/scene';

import { type LinkGeometry } from '../../utils/index.ts';
import { paintRuns } from './paint-order.ts';

const node = (id: string, z: string): Node => ({
  type: 'rect',
  id,
  z,
  center: { x: 0, y: 0 },
  size: { width: 96, height: 48 },
});

const link = (id: string, z: string): LinkGeometry => ({
  link: { type: 'line', id, z, source: { node: 'a' }, target: { node: 'b' } },
  path: 'M 0 0 L 1 1',
  source: { point: { x: 0, y: 0 }, side: 'e' },
  target: { point: { x: 1, y: 1 }, side: 'w' },
});

const shape = (runs: ReturnType<typeof paintRuns>) =>
  runs.map((run) => (run.kind === 'links' ? run.links.map(({ link }) => link.id) : run.nodes.map(({ id }) => id)));

describe('paintRuns', () => {
  test('nodes and links share one order, bottom first', ({ expect }) => {
    expect(shape(paintRuns([node('a', 'a1'), node('b', 'a3')], [link('ab', 'a2')]))).toEqual([['a'], ['ab'], ['b']]);
  });

  test('consecutive elements of one kind share a run', ({ expect }) => {
    const runs = paintRuns([node('a', 'a1'), node('b', 'a2')], [link('ab', 'a3'), link('bc', 'a4')]);
    expect(shape(runs)).toEqual([
      ['a', 'b'],
      ['ab', 'bc'],
    ]);
    expect(runs.map(({ kind }) => kind)).toEqual(['nodes', 'links']);
  });

  test('a shape sent to the back stays under the links it was over', ({ expect }) => {
    const front = paintRuns([node('rect', 'a9')], [link('ab', 'a2')]);
    expect(shape(front)).toEqual([['ab'], ['rect']]);
    const back = paintRuns([node('rect', 'a0')], [link('ab', 'a2')]);
    expect(shape(back)).toEqual([['rect'], ['ab']]);
  });
});
