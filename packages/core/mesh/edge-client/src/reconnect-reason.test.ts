//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { classifyCloseCode, classifySocketError } from './reconnect-reason.ts';

describe('classifyCloseCode', () => {
  test('offline wins over any close code', () => {
    // A 1006 while the browser has no network is a lost connection, not a server fault.
    expect(classifyCloseCode(1006, false)).toEqual('offline');
    expect(classifyCloseCode(1011, false)).toEqual('offline');
    expect(classifyCloseCode(1000, false)).toEqual('offline');
  });

  test('separates network death from server intent', () => {
    expect(classifyCloseCode(1006, true)).toEqual('abnormal');
    expect(classifyCloseCode(1000, true)).toEqual('normal');
    expect(classifyCloseCode(1001, true)).toEqual('going_away');
    expect(classifyCloseCode(1011, true)).toEqual('server_error');
  });

  test('groups server restart codes with going away', () => {
    expect(classifyCloseCode(1012, true)).toEqual('going_away');
    expect(classifyCloseCode(1013, true)).toEqual('going_away');
  });

  test('groups protocol and policy closes', () => {
    for (const code of [1002, 1003, 1007, 1008, 1009, 1010]) {
      expect(classifyCloseCode(code, true)).toEqual('policy');
    }
  });

  test('application codes are their own bucket', () => {
    expect(classifyCloseCode(4401, true)).toEqual('app');
    expect(classifyCloseCode(4999, true)).toEqual('app');
  });

  test('unknown codes fall through to other', () => {
    expect(classifyCloseCode(1005, true)).toEqual('other');
    expect(classifyCloseCode(undefined, true)).toEqual('other');
  });

  test('an unknown online state does not force offline', () => {
    // Outside a browser `navigator.onLine` is absent; that is not evidence of being offline.
    expect(classifyCloseCode(1006, undefined)).toEqual('abnormal');
  });
});

describe('classifySocketError', () => {
  test('distinguishes a dead network from a socket fault', () => {
    expect(classifySocketError(false)).toEqual('offline');
    expect(classifySocketError(true)).toEqual('socket_error');
    expect(classifySocketError(undefined)).toEqual('socket_error');
  });
});
