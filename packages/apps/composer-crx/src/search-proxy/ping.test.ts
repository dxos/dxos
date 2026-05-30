//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { decodePingAck, decodePingRequest } from './types';

describe('ping codecs', () => {
  test('decodes a well-formed request', ({ expect }) => {
    expect(decodePingRequest({ version: 1, id: 'abc' })).toEqual({ version: 1, id: 'abc' });
  });

  test('rejects a malformed or versioned request', ({ expect }) => {
    expect(decodePingRequest({ version: 2, id: 'abc' })).toBeUndefined();
    expect(decodePingRequest({ id: 'abc' })).toBeUndefined();
    expect(decodePingRequest({ version: 1 })).toBeUndefined();
    expect(decodePingRequest(null)).toBeUndefined();
  });

  test('decodes an ok ack with extension identity', ({ expect }) => {
    expect(decodePingAck({ version: 1, id: 'x', ok: true, extensionVersion: '0.8.3', extensionName: 'Composer' })).toEqual(
      { version: 1, id: 'x', ok: true, extensionVersion: '0.8.3', extensionName: 'Composer' },
    );
  });

  test('rejects an ok ack missing identity fields', ({ expect }) => {
    expect(decodePingAck({ version: 1, id: 'x', ok: true, extensionVersion: '0.8.3' })).toBeUndefined();
  });

  test('decodes a non-ok ack with a known error', ({ expect }) => {
    expect(decodePingAck({ version: 1, id: 'x', ok: false, error: 'forbiddenOrigin' })).toEqual({
      version: 1,
      id: 'x',
      ok: false,
      error: 'forbiddenOrigin',
    });
    expect(decodePingAck({ version: 1, id: 'x', ok: false, error: 'nope' })).toBeUndefined();
  });
});
