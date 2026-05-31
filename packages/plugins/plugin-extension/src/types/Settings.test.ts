//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as Settings from './Settings';

describe('Settings', () => {
  test('applies documented defaults when fields are absent', ({ expect }) => {
    expect(Settings.withDefaults({})).toEqual(Settings.defaults);
    expect(Settings.defaults.renderProxyEnabled).toBe(true);
    expect(Settings.defaults.renderTimeout).toBe(20_000);
  });

  test('merges user-set values over defaults', ({ expect }) => {
    const merged = Settings.withDefaults({ renderProxyEnabled: false, renderTimeout: 5_000 });
    expect(merged.renderProxyEnabled).toBe(false);
    expect(merged.renderTimeout).toBe(5_000);
    // Untouched fields fall back to defaults.
    expect(merged.renderActiveTab).toBe(false);
    expect(merged.developerMode).toBe(false);
  });
});
