//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import { createUrl } from './google-api';

describe('google-api', () => {
  test('createUrl', ({ expect }) => {
    const url = createUrl(['https://example.com', 'foo', undefined, 'bar'], { q: 'test' }).toString();
    expect(url).to.equal('https://example.com/foo/bar?q=test');
  });
});
