//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { getDeviceLabel } from './device-profile.ts';

describe('getDeviceLabel', () => {
  test('keeps a label someone gave the device and drops the placeholder', ({ expect }) => {
    expect(getDeviceLabel({ label: 'Work laptop' })).toBe('Work laptop');
    expect(getDeviceLabel({ label: 'initial identity device' })).toBeUndefined();
    expect(getDeviceLabel({ label: 'additional device' })).toBeUndefined();
    expect(getDeviceLabel({})).toBeUndefined();
  });
});
