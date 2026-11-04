//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Filter } from '@dxos/echo';

import { typeKeyFilter } from './helpers.ts';

describe('typeKeyFilter', () => {
  test('a versioned DXN pins its version', ({ expect }) => {
    expect(typeKeyFilter('dxn:org.example.type.invoice:2.0.0')).toEqual(
      Filter.key('org.example.type.invoice', { version: '2.0.0' }),
    );
  });

  test('a malformed DXN matches as written, not as an unpinned version', ({ expect }) => {
    expect(typeKeyFilter('dxn:org.example.type.invoice:2.0.0x')).toEqual(
      Filter.key('dxn:org.example.type.invoice:2.0.0x'),
    );
  });

  test('a bare typename matches any version', ({ expect }) => {
    expect(typeKeyFilter('org.example.type.invoice')).toEqual(Filter.key('org.example.type.invoice'));
  });
});
