//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { orderRows } from './gantt-rows.ts';
import { type GanttGroup, type GanttLane } from './Gantt.tsx';

const lane = (id: string, rest: Partial<GanttLane> = {}): GanttLane => ({
  id,
  label: id,
  status: 'done',
  ...rest,
});

/** `<row index>: <indent><lane id> [band]`, which is the shape a reader checks against the drawing. */
const format = ({ rows, bands }: ReturnType<typeof orderRows>): string =>
  [
    ...rows.map(({ lane, depth, index }) => `${index}: ${'  '.repeat(depth)}${lane.id}`),
    ...bands.map(({ group, first, last }) => `band ${group.id}: ${first}..${last}`),
  ].join('\n');

describe('orderRows', () => {
  test('a band holds its lanes in the order given', ({ expect }) => {
    const groups: GanttGroup[] = [{ id: 'g' }];
    const lanes = [lane('a', { groupId: 'g' }), lane('b', { groupId: 'g' }), lane('c', { groupId: 'g' })];
    expect(`\n${format(orderRows(groups, lanes))}\n`).toMatchInlineSnapshot(`
      "
      0: a
      1: b
      2: c
      band g: 0..2
      "
    `);
  });

  test('a lane nests under its parent, which indents it and the lanes under it', ({ expect }) => {
    const groups: GanttGroup[] = [{ id: 'g' }];
    const lanes = [
      lane('root', { groupId: 'g' }),
      lane('child', { groupId: 'g', parentId: 'root' }),
      lane('grandchild', { groupId: 'g', parentId: 'child' }),
      lane('sibling', { groupId: 'g' }),
    ];
    expect(`\n${format(orderRows(groups, lanes))}\n`).toMatchInlineSnapshot(`
      "
      0: root
      1:   child
      2:     grandchild
      3: sibling
      band g: 0..3
      "
    `);
  });

  test("a nested group's band follows its parent's, indented", ({ expect }) => {
    const groups: GanttGroup[] = [{ id: 'one' }, { id: 'one:a', parentId: 'one' }, { id: 'two' }];
    const lanes = [
      lane('p1', { groupId: 'one' }),
      lane('p1:task', { groupId: 'one' }),
      lane('p2', { groupId: 'one:a' }),
      lane('p4', { groupId: 'two' }),
    ];
    expect(`\n${format(orderRows(groups, lanes))}\n`).toMatchInlineSnapshot(`
      "
      0: p1
      1: p1:task
      2:   p2
      3: p4
      band one: 0..1
      band one:a: 2..2
      band two: 3..3
      "
    `);
  });

  test('every band is a contiguous run of rows that all belong to it', ({ expect }) => {
    // The invariant the rectangles rest on: one rect can only enclose adjacent rows, so a band's
    // range must hold its own lanes and nobody else's — however the caller interleaved the input.
    const groups: GanttGroup[] = [{ id: 'one' }, { id: 'one:a', parentId: 'one' }, { id: 'two' }];
    const lanes = [
      lane('from-two', { groupId: 'two' }),
      lane('from-one', { groupId: 'one' }),
      lane('from-nested', { groupId: 'one:a' }),
      lane('from-one-again', { groupId: 'one' }),
    ];
    const { rows, bands } = orderRows(groups, lanes);
    for (const { group, first, last } of bands) {
      expect(rows.slice(first, last + 1).map((row) => row.groupId)).toEqual(
        rows.slice(first, last + 1).map(() => group.id),
      );
    }
    expect(bands.map(({ group, first, last }) => `${group.id}:${first}..${last}`)).toEqual([
      'one:0..1',
      'one:a:2..2',
      'two:3..3',
    ]);
  });

  test('an ungrouped lane comes first and belongs to no band', ({ expect }) => {
    const groups: GanttGroup[] = [{ id: 'g' }];
    const lanes = [lane('grouped', { groupId: 'g' }), lane('loose')];
    const { rows, bands } = orderRows(groups, lanes);
    expect(rows.map((row) => row.lane.id)).toEqual(['loose', 'grouped']);
    expect(bands).toEqual([{ group: { id: 'g' }, first: 1, last: 1 }]);
  });

  test('a group with no lanes gets no band, so nothing draws an empty rectangle', ({ expect }) => {
    const { rows, bands } = orderRows([{ id: 'empty' }, { id: 'g' }], [lane('a', { groupId: 'g' })]);
    expect(rows).toHaveLength(1);
    expect(bands.map(({ group }) => group.id)).toEqual(['g']);
  });

  test('a lane whose parent sits in another group is dropped rather than misplaced', ({ expect }) => {
    // Nesting is within a band by definition; drawing such a lane anyway would put it inside a
    // rectangle that does not own it and break the contiguity the bands promise.
    const groups: GanttGroup[] = [{ id: 'one' }, { id: 'two' }];
    const lanes = [lane('a', { groupId: 'one' }), lane('b', { groupId: 'two', parentId: 'a' })];
    const { rows } = orderRows(groups, lanes);
    expect(rows.map((row) => row.lane.id)).toEqual(['a']);
  });
});
