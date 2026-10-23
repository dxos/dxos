//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { KAI_APPLICATION_IDS, edgeConsoleUrl, kaiApplicationId } from './constants.ts';

describe('edgeConsoleUrl', () => {
  test('names the environment the EDGE URL belongs to', ({ expect }) => {
    expect(edgeConsoleUrl('https://dev.dxos.network')).toBe(
      'https://hub.dev.dxos.network/console/edge/discord?env=dev',
    );
    expect(edgeConsoleUrl('http://localhost:8787/')).toBe(
      'https://hub.dev.dxos.network/console/edge/discord?env=local',
    );
    expect(edgeConsoleUrl('https://dxos.network')).toBe(
      'https://hub.dev.dxos.network/console/edge/discord?env=production',
    );
  });

  test('has no page for an unknown or missing EDGE', ({ expect }) => {
    expect(edgeConsoleUrl('https://edge.example.com')).toBeUndefined();
    expect(edgeConsoleUrl('not a url')).toBeUndefined();
    expect(edgeConsoleUrl(undefined)).toBeUndefined();
  });
});

describe('kaiApplicationId', () => {
  test('picks the Kai of the EDGE the URL belongs to', ({ expect }) => {
    expect(kaiApplicationId('https://dev.dxos.network/')).toBe(KAI_APPLICATION_IDS.dev);
    expect(kaiApplicationId('http://localhost:8787')).toBe(KAI_APPLICATION_IDS.local);
  });

  test('has no Kai for a custom or missing EDGE', ({ expect }) => {
    expect(kaiApplicationId('https://edge.example.com')).toBeUndefined();
    expect(kaiApplicationId(undefined)).toBeUndefined();
  });
});
