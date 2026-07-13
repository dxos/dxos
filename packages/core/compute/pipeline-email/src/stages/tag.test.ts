//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { parseTagResult } from './tag';

describe('parseTagResult', () => {
  test('parses tags (lowercased) and spam flag', ({ expect }) => {
    const result = parseTagResult('{"tags":["Invoice","Finance"],"spam":false}');
    expect(result.tags).toEqual(['invoice', 'finance']);
    expect(result.spam).toBe(false);
  });

  test('extracts JSON wrapped in prose', ({ expect }) => {
    const result = parseTagResult('Here you go:\n{"tags":["personal"],"spam":false}\nHope that helps.');
    expect(result.tags).toEqual(['personal']);
  });

  test('infers spam from a spam tag and dedups it', ({ expect }) => {
    const result = parseTagResult('{"tags":["spam","marketing"]}');
    expect(result.spam).toBe(true);
    expect(result.tags.filter((tag) => tag === 'spam')).toHaveLength(1);
  });

  test('adds the spam tag when the flag is set but the tag is missing', ({ expect }) => {
    const result = parseTagResult('{"tags":["promo"],"spam":true}');
    expect(result.spam).toBe(true);
    expect(result.tags).toContain('spam');
  });

  test('degrades to empty on unparseable output', ({ expect }) => {
    const result = parseTagResult('no json here');
    expect(result.tags).toEqual([]);
    expect(result.spam).toBe(false);
  });
});
