//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { extractUrls } from './extract-urls';

describe('extractUrls', () => {
  test('pulls plain URLs in order', ({ expect }) => {
    const text = 'see https://a.com and http://b.org for more';
    expect(extractUrls(text)).toEqual(['https://a.com', 'http://b.org']);
  });

  test('de-duplicates', ({ expect }) => {
    const text = 'https://x.com and https://x.com again';
    expect(extractUrls(text)).toEqual(['https://x.com']);
  });

  test('strips trailing punctuation that attaches in prose', ({ expect }) => {
    expect(extractUrls('check https://a.com, https://b.com.')).toEqual(['https://a.com', 'https://b.com']);
    expect(extractUrls('(see https://c.com)')).toEqual(['https://c.com']);
  });

  test('honours limit', ({ expect }) => {
    const text = 'https://a.com https://b.com https://c.com https://d.com';
    expect(extractUrls(text, 2)).toEqual(['https://a.com', 'https://b.com']);
  });

  test('returns empty for text with no URLs', ({ expect }) => {
    expect(extractUrls('nothing here')).toEqual([]);
  });
});
