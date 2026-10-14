//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { edgeConsoleUrl } from './constants.ts';

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
