//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { meta } from './meta';

describe('plugin meta', () => {
  test('has correct id', () => {
    expect(meta.id).toBe('org.dxos.plugin.daily-summary');
  });

  test('has required fields', () => {
    expect(meta.name).toBe('Daily Summary');
    expect(meta.description).toBeTruthy();
    expect(meta.icon).toBe('ph--calendar-check--regular');
    expect(meta.iconHue).toBe('amber');
    expect(meta.source).toContain('plugin-daily-summary');
  });
});
