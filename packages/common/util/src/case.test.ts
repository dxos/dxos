//
// Copyright 2024 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { decamelize, hyphenize } from './case';

describe('util', () => {
  test('decamelize', () => {
    expect(decamelize('fooBar')).to.eq('foo_bar');
    expect(hyphenize('fooBar')).to.eq('foo-bar');
  });
});
