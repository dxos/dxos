//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { missingTools } from './preflight.ts';

describe('preflight', () => {
  // Fails first and says what to install, instead of a native, browser or bindings test failing later.
  test('the container has the tools the suite needs', ({ expect }) => {
    expect(missingTools()).toEqual([]);
  });
});
