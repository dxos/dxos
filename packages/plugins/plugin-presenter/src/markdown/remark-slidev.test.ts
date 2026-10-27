//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { isSafeUrl } from './remark-slidev.ts';

describe('isSafeUrl', () => {
  test('allows relative URLs and allowlisted schemes', ({ expect }) => {
    expect(isSafeUrl('./a.png', false)).toBe(true);
    expect(isSafeUrl('https://example.com', false)).toBe(true);
    expect(isSafeUrl('echo:///01ABC', false)).toBe(true);
  });

  test('allows data and blob URLs only as image sources', ({ expect }) => {
    expect(isSafeUrl('data:image/png;base64,AAAA', true)).toBe(true);
    expect(isSafeUrl('blob:http://localhost/1234', true)).toBe(true);
    expect(isSafeUrl('data:image/png;base64,AAAA', false)).toBe(false);
    expect(isSafeUrl('blob:http://localhost/1234', false)).toBe(false);
  });

  test('rejects script schemes, however spelled', ({ expect }) => {
    expect(isSafeUrl('javascript:alert(1)', true)).toBe(false);
    expect(isSafeUrl('java\tscript:alert(1)', false)).toBe(false);
    expect(isSafeUrl('data:text/html,<script>', true)).toBe(false);
  });
});
