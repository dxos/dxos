//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { parseTimestamp, parseUrlTimestamp } from './decorate-transcript';

describe('parseTimestamp', () => {
  test('parses m:ss', ({ expect }) => {
    expect(parseTimestamp('0:12')).toBe(12);
    expect(parseTimestamp('1:02')).toBe(62);
    expect(parseTimestamp('12:34')).toBe(754);
  });

  test('parses h:mm:ss', ({ expect }) => {
    expect(parseTimestamp('1:02:33')).toBe(3753);
  });

  test('rejects non-timestamps and out-of-range', ({ expect }) => {
    expect(parseTimestamp('hello')).toBeUndefined();
    expect(parseTimestamp('1:99')).toBeUndefined();
    expect(parseTimestamp('')).toBeUndefined();
  });
});

describe('parseUrlTimestamp', () => {
  test('parses plain and s-suffixed seconds', ({ expect }) => {
    expect(parseUrlTimestamp('https://youtu.be/x?t=62')).toBe(62);
    expect(parseUrlTimestamp('https://youtu.be/x?t=62s')).toBe(62);
    expect(parseUrlTimestamp('https://www.youtube.com/watch?v=x&t=90')).toBe(90);
  });

  test('parses h/m/s composite and hash fragment', ({ expect }) => {
    expect(parseUrlTimestamp('https://youtu.be/x?t=1m2s')).toBe(62);
    expect(parseUrlTimestamp('https://youtu.be/x?t=1h0m5s')).toBe(3605);
    expect(parseUrlTimestamp('https://example.com/v#t=30')).toBe(30);
  });

  test('returns undefined when no t param', ({ expect }) => {
    expect(parseUrlTimestamp('https://youtu.be/x')).toBeUndefined();
  });
});
