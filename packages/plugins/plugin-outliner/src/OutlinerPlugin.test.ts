//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { OutlinerPlugin } from './OutlinerPlugin';

describe('OutlinerPlugin', () => {
  test('factory exposes meta', ({ expect }) => {
    expect(OutlinerPlugin.meta).toBeDefined();
    expect(OutlinerPlugin.meta.id).toBeTypeOf('string');
  });
});
