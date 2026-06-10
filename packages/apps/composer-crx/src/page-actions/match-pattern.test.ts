//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { matchesUrlPatterns } from './match-pattern';

describe('matchesUrlPatterns', () => {
  test('all-urls patterns', ({ expect }) => {
    expect(matchesUrlPatterns('https://example.com/page', ['https://*/*'])).toBe(true);
    expect(matchesUrlPatterns('http://example.com/', ['http://*/*'])).toBe(true);
    expect(matchesUrlPatterns('https://example.com/', ['<all_urls>'])).toBe(true);
  });

  test('scheme wildcard matches http and https only', ({ expect }) => {
    expect(matchesUrlPatterns('https://a.com/x', ['*://*/*'])).toBe(true);
    expect(matchesUrlPatterns('ftp://a.com/x', ['*://*/*'])).toBe(false);
  });

  test('host and subdomain wildcards', ({ expect }) => {
    expect(matchesUrlPatterns('https://www.youtube.com/watch?v=1', ['https://*.youtube.com/watch*'])).toBe(true);
    expect(matchesUrlPatterns('https://youtube.com/watch?v=1', ['https://*.youtube.com/watch*'])).toBe(true);
    expect(matchesUrlPatterns('https://vimeo.com/watch', ['https://*.youtube.com/watch*'])).toBe(false);
    expect(matchesUrlPatterns('https://evil.com/?x=youtube.com', ['https://*.youtube.com/*'])).toBe(false);
  });

  test('path matching includes query string', ({ expect }) => {
    expect(matchesUrlPatterns('https://a.com/p/q?x=1', ['https://a.com/p/*'])).toBe(true);
    expect(matchesUrlPatterns('https://a.com/other', ['https://a.com/p/*'])).toBe(false);
  });

  test('invalid inputs are false', ({ expect }) => {
    expect(matchesUrlPatterns('not-a-url', ['https://*/*'])).toBe(false);
    expect(matchesUrlPatterns('https://a.com/', ['garbage'])).toBe(false);
    expect(matchesUrlPatterns('https://a.com/', [])).toBe(false);
  });
});
