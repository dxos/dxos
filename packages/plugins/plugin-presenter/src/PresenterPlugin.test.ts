//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { PresenterPlugin } from './PresenterPlugin';

describe('PresenterPlugin', () => {
  test('factory exposes meta', ({ expect }) => {
    expect(PresenterPlugin.meta).toBeDefined();
    expect(PresenterPlugin.meta.id).toBeTypeOf('string');
  });
});
