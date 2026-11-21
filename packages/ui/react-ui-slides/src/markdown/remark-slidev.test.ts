//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { iconSymbol, isSafeUrl } from './remark-slidev.ts';

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

describe('iconSymbol', () => {
  test('a bare name is the regular Phosphor glyph', ({ expect }) => {
    expect(iconSymbol('brain')).toBe('ph--brain--regular');
    expect(iconSymbol('users-three')).toBe('ph--users-three--regular');
    expect(iconSymbol('number-circle-1')).toBe('ph--number-circle-1--regular');
  });

  test('a whole symbol is taken as written, whatever its set or weight', ({ expect }) => {
    expect(iconSymbol('ph--brain--regular')).toBe('ph--brain--regular');
    expect(iconSymbol('ph--brain--duotone')).toBe('ph--brain--duotone');
    expect(iconSymbol('dx--composer--regular')).toBe('dx--composer--regular');
  });

  test('anything else names no icon', ({ expect }) => {
    for (const value of ['', 'Brain', 'shield check', 'shield_check', '-brain', 'brain-', 'ph--brain', 'a--b--c--d']) {
      expect(iconSymbol(value), value).toBeUndefined();
    }
    // Nothing that could carry markup or a URL reaches the renderer.
    expect(iconSymbol('"><script>')).toBeUndefined();
    expect(iconSymbol('https://example.com/a.svg')).toBeUndefined();
  });
});
