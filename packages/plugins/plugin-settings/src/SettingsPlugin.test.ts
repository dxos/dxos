//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { SettingsPlugin } from './SettingsPlugin';

describe('SettingsPlugin', () => {
  test('factory exposes meta', ({ expect }) => {
    expect(SettingsPlugin.meta).toBeDefined();
    expect(SettingsPlugin.meta.id).toBeTypeOf('string');
  });
});
