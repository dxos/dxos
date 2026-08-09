//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { assertLoopbackOrigin, resolveDebugPortOrigin } from './debug-port';

describe('assertLoopbackOrigin', () => {
  // The port evaluates whatever the server sends, so this check is the boundary that keeps a
  // remote host from driving eval in the page — not a formatting nicety.
  test('accepts loopback hosts', () => {
    for (const origin of [
      'http://127.0.0.1:9321',
      'https://127.0.0.1:9321',
      'http://localhost:9321',
      'http://[::1]:9321',
    ]) {
      expect(assertLoopbackOrigin(origin).origin).toBeTypeOf('string');
    }
  });

  test('rejects remote hosts', () => {
    for (const origin of ['http://evil.example.com', 'https://10.0.0.5:9321', 'http://169.254.169.254']) {
      expect(() => assertLoopbackOrigin(origin)).toThrow(/must be loopback/);
    }
  });

  // A hostname that merely contains a loopback name must not pass on a substring match.
  test('rejects hosts that only look like loopback', () => {
    for (const origin of ['http://localhost.evil.com', 'http://127.0.0.1.evil.com', 'http://not-localhost']) {
      expect(() => assertLoopbackOrigin(origin)).toThrow(/must be loopback/);
    }
  });

  test('rejects unparseable origins', () => {
    expect(() => assertLoopbackOrigin('not a url')).toThrow(/not a URL/);
  });

  test('the default origin passes its own check', () => {
    expect(assertLoopbackOrigin(resolveDebugPortOrigin()).hostname).toBe('127.0.0.1');
  });
});
