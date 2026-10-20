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
    ).toBe('Filter.type(id: [1ZR3]).from({ space: "BPBG" })');
  });

  test('keeps the random tail of ids that share a timestamp prefix', ({ expect }) => {
    expect(shortQueryText('Query.select(Filter.id(01M3V2H2ZJ0FC014B9RA961ZR3, 01M3V2H31K8QW7NXT2D5G4HB6C))')).toBe(
      'Filter.id(1ZR3, HB6C)',
    );
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
