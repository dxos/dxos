//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { imageUrl } from './image-node.ts';

describe('imageUrl', () => {
  test('a web link is drawn; anything else in shared data is not followed', ({ expect }) => {
    expect(imageUrl('https://dxos.org/logo.png')).toBe('https://dxos.org/logo.png');
    expect(imageUrl('http://localhost:9009/a.png')).toBe('http://localhost:9009/a.png');
    expect(imageUrl('javascript:alert(1)')).toBeUndefined();
    expect(imageUrl('data:image/png;base64,AAAA')).toBeUndefined();
    expect(imageUrl('not a url')).toBeUndefined();
    expect(imageUrl(undefined)).toBeUndefined();
  });
});
