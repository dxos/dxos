//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { PublicKey } from '@dxos/keys';

import { rpcCodec } from './rpc-codec';

const roundTrip = (value: any): any => rpcCodec.decode(rpcCodec.encode(value));

describe('rpcCodec', () => {
  test('carries what JSON already carried', () => {
    const value = [{ a: 1, b: 'two', c: true, d: null, e: [1, [2, [3]]], f: { g: {} } }];
    expect(roundTrip(value)).toEqual(value);
  });

  test('round-trips a PublicKey as a PublicKey, not a hex string', () => {
    const key = PublicKey.random();
    const [decoded] = roundTrip([key]);
    expect(PublicKey.isPublicKey(decoded)).toBe(true);
    expect(decoded.equals(key)).toBe(true);
  });

  test('round-trips a Uint8Array as bytes, not an index map', () => {
    const bytes = new Uint8Array([0, 1, 127, 128, 255]);
    const [decoded] = roundTrip([bytes]);
    expect(decoded).toBeInstanceOf(Uint8Array);
    expect([...decoded]).toEqual([...bytes]);
  });

  test('round-trips an empty Uint8Array', () => {
    const [decoded] = roundTrip([new Uint8Array()]);
    expect(decoded).toBeInstanceOf(Uint8Array);
    expect(decoded.length).toBe(0);
  });

  test('encodes a byte view without dragging in the rest of its buffer', () => {
    const view = new Uint8Array([1, 2, 3, 4, 5, 6]).subarray(2, 4);
    const [decoded] = roundTrip([view]);
    expect([...decoded]).toEqual([3, 4]);
  });

  test('reaches values nested in objects and arrays', () => {
    const key = PublicKey.random();
    const bytes = new Uint8Array([9, 8, 7]);
    const [decoded] = roundTrip([{ spaces: [{ key, payload: { bytes } }] }]);
    expect(decoded.spaces[0].key.equals(key)).toBe(true);
    expect([...decoded.spaces[0].payload.bytes]).toEqual([9, 8, 7]);
  });

  test('a Buffer arrives as a Uint8Array with the same bytes', () => {
    const [decoded] = roundTrip([Buffer.from([1, 2, 3])]);
    expect(decoded).toBeInstanceOf(Uint8Array);
    expect([...decoded]).toEqual([1, 2, 3]);
  });

  test('matches the previous encoding for plain payloads', () => {
    const value = [{ spaceId: 'S1', docId: 'd0', counters: [0, 1, 2] }];
    const encoded = rpcCodec.encode(value);
    expect(Buffer.from(encoded.value).toString()).toBe(JSON.stringify(value));
  });

  test('rejects an unknown tag rather than returning a half-decoded object', () => {
    const encoded = rpcCodec.encode([{}]);
    const poisoned = Buffer.from(JSON.stringify([{ '@dxos/blade-runner/type': 'Nope', 'value': 'x' }]));
    expect(() => rpcCodec.decode({ ...encoded, value: poisoned })).toThrow(/unknown encoded type: Nope/);
  });
});
