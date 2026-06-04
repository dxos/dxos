//
// Copyright 2026 DXOS.org
//

import { describe, test, vi } from 'vitest';

// `urls.ts` imports the real `webextension-polyfill`, which throws outside a
// browser extension. `matchesPattern` is pure, so a minimal stub suffices.
vi.mock('webextension-polyfill', () => ({ default: { storage: { sync: {} } } }));

const { matchesPattern } = await import('./urls');

describe('matchesPattern', () => {
  test('matches an exact host with a trailing path glob', ({ expect }) => {
    expect(matchesPattern('http://localhost:5173/*', 'http://localhost:5173/')).toBe(true);
    expect(matchesPattern('http://localhost:5173/*', 'http://localhost:5173/space/abc')).toBe(true);
    expect(matchesPattern('https://composer.dxos.org/*', 'https://composer.dxos.org/foo?bar=1')).toBe(true);
  });

  test('respects the port', ({ expect }) => {
    expect(matchesPattern('http://localhost:5173/*', 'http://localhost:4200/')).toBe(false);
    expect(matchesPattern('http://localhost:5173/*', 'http://localhost/')).toBe(false);
  });

  test('respects the scheme', ({ expect }) => {
    expect(matchesPattern('https://composer.dxos.org/*', 'http://composer.dxos.org/')).toBe(false);
  });

  test('supports a wildcard scheme', ({ expect }) => {
    expect(matchesPattern('*://composer.dxos.org/*', 'http://composer.dxos.org/')).toBe(true);
    expect(matchesPattern('*://composer.dxos.org/*', 'https://composer.dxos.org/')).toBe(true);
  });

  test('supports a wildcard host', ({ expect }) => {
    expect(matchesPattern('https://*/*', 'https://anything.example/')).toBe(true);
  });

  test('supports a leading subdomain wildcard', ({ expect }) => {
    expect(matchesPattern('https://*.composer.space/*', 'https://labs.composer.space/')).toBe(true);
    expect(matchesPattern('https://*.composer.space/*', 'https://composer.space/')).toBe(true);
    expect(matchesPattern('https://*.composer.space/*', 'https://evil.example/')).toBe(false);
  });

  test('rejects a different host', ({ expect }) => {
    expect(matchesPattern('https://composer.dxos.org/*', 'https://evil.example/')).toBe(false);
  });

  test('does not treat the host as a regexp', ({ expect }) => {
    expect(matchesPattern('https://composer.dxos.org/*', 'https://composerxdxos.org/')).toBe(false);
  });

  test('returns false for unparseable candidates', ({ expect }) => {
    expect(matchesPattern('http://localhost:5173/*', 'not a url')).toBe(false);
  });

  test('returns false for an unparseable pattern', ({ expect }) => {
    expect(matchesPattern('localhost', 'http://localhost/')).toBe(false);
  });
});
