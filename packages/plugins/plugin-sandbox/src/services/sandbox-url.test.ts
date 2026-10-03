//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { acceptsCredentials } from './sandbox-url.ts';

describe('acceptsCredentials', () => {
  test('admits https', ({ expect }) => {
    expect(acceptsCredentials('https://edge.dxos.network/sandbox')).toBe(true);
  });

  test('admits plain http only on loopback, where nothing leaves the machine', ({ expect }) => {
    expect(acceptsCredentials('http://localhost:8792')).toBe(true);
    expect(acceptsCredentials('http://127.0.0.1:8792')).toBe(true);
  });

  test('withholds the credential from cleartext across a network', ({ expect }) => {
    expect(acceptsCredentials('http://sandbox.example.com')).toBe(false);
    expect(acceptsCredentials('http://192.168.1.10:8792')).toBe(false);
  });

  test('withholds it from a malformed url rather than guessing', ({ expect }) => {
    expect(acceptsCredentials('not-a-url')).toBe(false);
    expect(acceptsCredentials('')).toBe(false);
  });
});
