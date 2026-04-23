//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ObservabilityPlugin } from './ObservabilityPlugin';

describe('ObservabilityPlugin', () => {
  test('factory exposes meta', ({ expect }) => {
    expect(ObservabilityPlugin.meta).toBeDefined();
    expect(ObservabilityPlugin.meta.id).toBeTypeOf('string');
  });
});
