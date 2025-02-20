//
// Copyright 2024 DXOS.org
//

import { expect, test } from 'vitest';

import { IdentityDid } from './identity-did';

test('identity-did', () => {
  const id = IdentityDid.random();

  expect(id.length).toBe(42);
  expect(IdentityDid.isValid(id)).toBe(true);
  const decoded = IdentityDid.decode(id);
  expect(decoded.length).toBe(IdentityDid.byteLength);
  expect(IdentityDid.encode(decoded)).toBe(id);
});
