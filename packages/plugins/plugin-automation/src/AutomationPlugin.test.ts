//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { AutomationPlugin } from './AutomationPlugin';

describe('AutomationPlugin', () => {
  test('factory exposes meta', ({ expect }) => {
    expect(AutomationPlugin.meta).toBeDefined();
    expect(AutomationPlugin.meta.id).toBeTypeOf('string');
  });
});
