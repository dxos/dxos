//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { chunk } from './chunk';

describe('chunk', () => {
  test('empty/whitespace text yields no chunks', ({ expect }) => {
    expect(chunk('')).toEqual([]);
    expect(chunk('   \n  ')).toEqual([]);
  });

  test('short text is a single trimmed chunk', ({ expect }) => {
    expect(chunk('  Alice works at DXOS.  ')).toEqual(['Alice works at DXOS.']);
  });

  test('packs multiple sentences under the limit into one chunk', ({ expect }) => {
    const text = 'Alice leads ECHO. Bob works at DXOS. Carol joined in 2024.';
    expect(chunk(text)).toEqual([text]);
  });

  test('splits on sentence boundaries when over the limit', ({ expect }) => {
    const text = 'Alice leads ECHO. Bob works at DXOS. Carol joined in 2024.';
    const chunks = chunk(text, 24);
    // Every chunk stays within budget and ends at a sentence boundary.
    for (const value of chunks) {
      expect(value.length).toBeLessThanOrEqual(24);
      expect(/[.!?]$/.test(value)).toBe(true);
    }
    // No sentence is lost.
    expect(chunks.join(' ')).toBe(text);
    expect(chunks.length).toBeGreaterThan(1);
  });

  test('hard-splits a single oversized sentence', ({ expect }) => {
    const sentence = `${'x'.repeat(50)} and ${'y'.repeat(50)}`; // no internal sentence break
    const chunks = chunk(sentence, 20);
    expect(chunks.length).toBeGreaterThan(1);
    for (const value of chunks) {
      expect(value.length).toBeLessThanOrEqual(20);
    }
  });
});
