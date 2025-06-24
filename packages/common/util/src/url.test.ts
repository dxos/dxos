//
// Copyright 2025 DXOS.org
//

import { describe, it } from 'vitest';

import { createUrl } from './url';

describe('url', () => {
  it('should create a url', ({ expect }) => {
    const url = createUrl('https://example.com', {
      i1: undefined,
      i2: null,
      p1: true,
      p2: false,
      p3: 'dxos',
      p4: 100,
    });

    expect(url.toString()).toBe('https://example.com/?p1=true&p2=false&p3=dxos&p4=100');
  });
});
