//
// Copyright 2024 DXOS.org
//

import { expect, test } from 'vitest';

import { SpaceId } from './space-id.ts';

test('space-id', () => {
  const id = SpaceId.random();

  expect(SpaceId.isValid(id)).toBe(true);
  expect(id.length).toBe(33);
  const decoded = SpaceId.decode(id);
  expect(decoded.length).toBe(SpaceId.byteLength);
  expect(SpaceId.encode(decoded)).toBe(id);
});

test('local space ids are recognisable and valid', () => {
  const seed = new Uint8Array(SpaceId.byteLength).fill(0xff);
  const local = SpaceId.local(seed);

  expect(SpaceId.isValid(local)).toBe(true);
  expect(local.startsWith('BLOCALDB')).toBe(true);
  expect(SpaceId.isLocal(local)).toBe(true);
  expect(SpaceId.local(seed)).toBe(local);
  expect(SpaceId.encode(SpaceId.decode(local))).toBe(local);
  expect(SpaceId.isLocal(SpaceId.random())).toBe(false);
  expect(SpaceId.isLocal(SpaceId.encode(seed))).toBe(false);
});
