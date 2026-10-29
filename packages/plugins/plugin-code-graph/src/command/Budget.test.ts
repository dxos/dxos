//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Iri, Model } from '#graph';

import * as Budget from './Budget.ts';

const file = (path: string) => `${Iri.FILE}${path}`;

describe('Budget', () => {
  test('keeps everything that fits', ({ expect }) => {
    const patch = Model.missing(
      { nodes: [], edges: [] },
      Model.fromRows([{ from: file('a/src/x.ts'), to: file('a/src/y.ts') }]),
    );
    expect(Budget.cap([], patch, 10)).toEqual({ patch });
  });

  test('keeps the first boxes and the arrows between them, and summarises the rest', ({ expect }) => {
    const rows = Array.from({ length: 6 }, (_, index) => ({
      from: file('packages/a/src/index.ts'),
      to: file(`packages/${index < 3 ? 'a' : 'b'}/src/file-${index}.ts`),
    }));
    const added = Model.missing({ nodes: [], edges: [] }, Model.fromRows(rows));
    const { patch, trailer } = Budget.cap([], added, 3);
    expect(patch.nodes.map(({ label }) => label)).toEqual(['index.ts', 'file-0.ts', 'file-1.ts']);
    expect(patch.edges).toHaveLength(2);
    expect(trailer?.count).toBe(4);
    expect(trailer?.byKind).toEqual({ file: 4 });
    expect(trailer?.byGroup).toEqual([
      { group: 'packages/b', count: 3 },
      { group: 'packages/a', count: 1 },
    ]);
    expect(trailer?.text).toBe(
      '+4 not shown: 4 files in packages/b (3), packages/a (1), e.g. file-2.ts, file-3.ts, file-4.ts, file-5.ts',
    );
  });

  test('an arrow to a box already on the graph is kept', ({ expect }) => {
    const current = [Model.makeNode(file('packages/a/src/index.ts'))];
    const rows = [
      { from: file('packages/a/src/index.ts'), to: file('packages/a/src/one.ts') },
      { from: file('packages/a/src/index.ts'), to: file('packages/a/src/two.ts') },
    ];
    const missing = Model.missing({ nodes: current, edges: [] }, Model.fromRows(rows));
    const { patch } = Budget.cap(current, missing, 1);
    expect(patch.nodes.map(({ label }) => label)).toEqual(['one.ts']);
    expect(patch.edges.map(({ to }) => Iri.labelOf(to))).toEqual(['one.ts']);
  });

  test('merge adds counts and keeps the text consistent', ({ expect }) => {
    const left = Budget.summarize([Model.makeNode(`${Iri.PACKAGE}@dxos/echo`)]);
    const right = Budget.summarize([Model.makeNode(`${Iri.PACKAGE}@dxos/halo`)]);
    expect(Budget.merge(left, right)?.text).toBe('+2 not shown: 2 packages, e.g. @dxos/echo, @dxos/halo');
    expect(Budget.merge(undefined, right)).toBe(right);
  });
});
