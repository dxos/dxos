//
// Copyright 2024 DXOS.org
//

import * as JSONSchema from 'effect/JSONSchema';
import * as Schema from 'effect/Schema';
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

test('identity-did schema', () => {
  const id = IdentityDid.random();

  // Validates and brands a plain string.
  expect(IdentityDid.make(id)).toBe(id);
  expect(Schema.is(IdentityDid)(id)).toBe(true);
  expect(Schema.is(IdentityDid)('not-a-did')).toBe(false);

  // Serializes to JSON Schema (a plain string type), unlike Schema.instanceOf.
  expect(() => JSONSchema.make(IdentityDid)).not.toThrow();
});
