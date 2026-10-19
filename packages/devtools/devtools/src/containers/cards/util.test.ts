//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { shortQueryText } from './util.tsx';

describe('shortQueryText', () => {
  test('shortens ids, space keys and a one-space from()', ({ expect }) => {
    expect(
      shortQueryText(
        'Query.select(Filter.type(id: [01M3V2H2ZJ0FC014B9RA961ZR3])).from([{ space: "BPBG3HN4O2XTMB5MRDZQXJBAXA7LAH4IA", includeAllFeeds: true }])',
      ),
    ).toBe('Filter.type(id: [01M3]).from({ space: "BPBG" })');
  });

  test('drops only the select wrapper of a plain query', ({ expect }) => {
    expect(shortQueryText('Query.select(Filter.type(org.dxos.type.document))')).toBe(
      'Filter.type(org.dxos.type.document)',
    );
  });

  test('keeps text that is not a select', () => {
    expect(shortQueryText('Query.all(a, b)')).toBe('Query.all(a, b)');
  });
});
