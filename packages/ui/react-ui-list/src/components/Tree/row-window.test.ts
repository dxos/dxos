//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { flattenRowUnits } from './row-window.ts';
import { type TreeNodeEntry } from './TreeContext.ts';

type NodeSpec = { id: string; branch?: boolean; open?: boolean; group?: boolean; children?: NodeSpec[] };

const makeEntry = ({
  id,
  branch = false,
  open = false,
  group = false,
  children,
}: NodeSpec): TreeNodeEntry<{
  id: string;
}> => ({
  id,
  value: id,
  path: [id],
  indexPath: [0],
  level: 0,
  last: false,
  item: { id },
  props: { id, label: id },
  group,
  branch,
  open,
  current: false,
  children: children?.map(makeEntry),
});

const flatten = (specs: NodeSpec[]) => flattenRowUnits(specs.map(makeEntry))?.map((unit) => unit.key);

describe('flattenRowUnits', () => {
  test('a flat list is one unit per row', () => {
    expect(flatten([{ id: 'a' }, { id: 'b' }])).toEqual(['a', 'b']);
  });

  test('an open branch contributes its subtree, in view order', () => {
    expect(
      flatten([{ id: 'a', branch: true, open: true, children: [{ id: 'a1' }, { id: 'a2' }] }, { id: 'b' }]),
    ).toEqual(['a', 'a1', 'a2', 'b']);
  });

  test('a closed branch contributes only its own row', () => {
    expect(flatten([{ id: 'a', branch: true, children: [{ id: 'a1' }] }, { id: 'b' }])).toEqual(['a', 'b']);
  });

  test('a group contributes a header before its children', () => {
    const units = flattenRowUnits([makeEntry({ id: 'g', group: true, children: [{ id: 'a' }] })]);
    expect(units?.map((unit) => unit.kind)).toEqual(['header', 'row']);
  });

  // The window keys a row's measured extent by the row's id, so one id at two paths would have each
  // row read back the other's height.
  test('a repeated id gives up on windowing', () => {
    expect(flatten([{ id: 'a', branch: true, open: true, children: [{ id: 'a' }] }])).toBeUndefined();
    expect(flatten([{ id: 'a' }, { id: 'a' }])).toBeUndefined();
  });
});
