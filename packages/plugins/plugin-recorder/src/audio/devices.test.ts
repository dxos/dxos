//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { PREFERRED_MICROPHONE, audioConstraints, pickDevice } from './devices.ts';

const devices = [
  { deviceId: 'builtin', label: 'MacBook Pro Microphone' },
  { deviceId: 'shure', label: 'Shure MV7' },
];

describe('pickDevice', () => {
  test('keeps a connected choice', ({ expect }) => {
    expect(pickDevice(devices, 'builtin', PREFERRED_MICROPHONE)).toBe('builtin');
  });

  test('prefers a Shure when nothing (or a disconnected device) is chosen', ({ expect }) => {
    expect(pickDevice(devices, undefined, PREFERRED_MICROPHONE)).toBe('shure');
    expect(pickDevice(devices, 'gone', PREFERRED_MICROPHONE)).toBe('shure');
    expect(pickDevice(devices)).toBe('builtin');
  });

  test('falls back to the first device, or none', ({ expect }) => {
    expect(pickDevice([devices[0]])).toBe('builtin');
    expect(pickDevice([])).toBeUndefined();
  });
});

describe('audioConstraints', () => {
  test('turns processing off and pins the device', ({ expect }) => {
    expect(audioConstraints('shure')).toEqual({
      deviceId: { exact: 'shure' },
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
    });
    expect(audioConstraints()).not.toHaveProperty('deviceId');
  });
});
