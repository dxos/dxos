//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as Settings from './Settings';

describe('Settings', () => {
  test('applies documented defaults when fields are absent', ({ expect }) => {
    expect(Settings.withDefaults({})).toEqual(Settings.defaults);
    expect(Settings.defaults.enabled).toBe(true);
    expect(Settings.defaults.autoOpenAfterClip).toBe(false);
    expect(Settings.defaults.renderProxyEnabled).toBe(true);
    expect(Settings.defaults.renderTimeout).toBe(20_000);
    expect(Settings.defaults.renderActiveTab).toBe(false);
    expect(Settings.defaults.developerMode).toBe(false);
  });

  test('merges user-set values over defaults', ({ expect }) => {
    const merged = Settings.withDefaults({ renderProxyEnabled: false, renderTimeout: 5_000, enabled: false });
    expect(merged.enabled).toBe(false);
    expect(merged.autoOpenAfterClip).toBe(false);
    expect(merged.renderProxyEnabled).toBe(false);
    expect(merged.renderTimeout).toBe(5_000);
    // Untouched fields fall back to defaults.
    expect(merged.renderActiveTab).toBe(false);
    expect(merged.developerMode).toBe(false);
  });
});
