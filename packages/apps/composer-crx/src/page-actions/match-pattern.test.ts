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

  test('case-insensitive host comparison', ({ expect }) => {
    expect(matchesUrlPatterns('https://example.com/', ['https://Example.com/*'])).toBe(true);
    expect(matchesUrlPatterns('https://example.com/', ['https://EXAMPLE.COM/*'])).toBe(true);
  });

  test('exact-path pattern does not match when query string present', ({ expect }) => {
    expect(matchesUrlPatterns('https://a.com/p?x=1', ['https://a.com/p'])).toBe(false);
  });

  test('URL with explicit port matches hostname-only pattern', ({ expect }) => {
    // Chrome match patterns compare hostname (no port); URL.hostname has no port.
    expect(matchesUrlPatterns('https://a.com:8080/x', ['https://a.com/*'])).toBe(true);
  });

  test('ReDoS: pathological repeated-segment pattern returns quickly', ({ expect }) => {
    const pattern = 'https://a.com/' + 'ab*'.repeat(30) + 'c';
    const url = 'https://a.com/' + 'ab'.repeat(3000);
    const start = Date.now();
    const result = matchesUrlPatterns(url, [pattern]);
    expect(Date.now() - start).toBeLessThan(1000);
    expect(result).toBe(false);
  });

  test('ReDoS: adjacent-star pattern returns quickly on non-matching path', ({ expect }) => {
    const pattern = 'https://a.com/' + '*'.repeat(50) + 'x';
    const url = 'https://a.com/' + 'y'.repeat(3000);
    const start = Date.now();
    const result = matchesUrlPatterns(url, [pattern]);
    expect(Date.now() - start).toBeLessThan(1000);
    expect(result).toBe(false);
  });

  test('glob with multiple wildcards matches and non-matches correctly', ({ expect }) => {
    expect(matchesUrlPatterns('https://a.com/aXXbYYc', ['https://a.com/a*b*c'])).toBe(true);
    expect(matchesUrlPatterns('https://a.com/acb', ['https://a.com/a*b*c'])).toBe(false);
  });
});
