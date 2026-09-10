//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import { describe, test } from 'vitest';

import * as UrlPath from '@dxos/app-toolkit/UrlPath';

import { format, fromSegment, parse, toSegment } from './navigation';

const table: UrlPath.KeyTable = new Map<string, UrlPath.KeyTableEntry>([
  ['w', { key: 'w', hasId: true, anchor: true }],
  ['companion', { key: 'companion', hasId: true }],
  ['object', { key: 'object', hasId: true }],
  ['home', { key: 'home', hasId: false }],
]);

const WORKSPACE = 'BA25QRC2FEWCSAMRP4RZL65LWJ7352CKE';

describe('segments', () => {
  test('a keyed pair round-trips', ({ expect }) => {
    const pair = { key: 'object', id: '01JXYZ', workspace: WORKSPACE };
    expect(toSegment(pair)).toBe('object/01JXYZ');
    expect(fromSegment('object/01JXYZ', WORKSPACE)).toEqual(pair);
  });

  test('a singleton carries no id', ({ expect }) => {
    expect(toSegment({ key: 'home', workspace: WORKSPACE })).toBe('home');
    expect(fromSegment('home', WORKSPACE)).toEqual({ key: 'home', workspace: WORKSPACE });
  });

  test('an id containing a slash survives, since only the first separates', ({ expect }) => {
    expect(fromSegment('object/a/b', WORKSPACE)).toEqual({ key: 'object', id: 'a/b', workspace: WORKSPACE });
  });
});

describe('the round trip', () => {
  const cases = [
    { name: 'workspace only', pairs: [] },
    { name: 'one plank', pairs: [{ key: 'object', id: '01JXYZ', workspace: WORKSPACE }] },
    {
      name: 'a plank and its companion',
      pairs: [
        { key: 'object', id: '01JXYZ', workspace: WORKSPACE },
        { key: 'companion', id: 'comments', workspace: WORKSPACE },
      ],
    },
    {
      name: 'a singleton between planks',
      pairs: [
        { key: 'home', workspace: WORKSPACE },
        { key: 'object', id: '01JXYZ', workspace: WORKSPACE },
      ],
    },
  ];

  for (const { name, pairs } of cases) {
    test(name, ({ expect }) => {
      const navigation = { workspace: WORKSPACE, pairs };
      const reparsed = parse(format(navigation), table);
      expect(Option.getOrThrow(reparsed)).toEqual(navigation);
    });
  }
});
