//
// Copyright 2024 DXOS.org
//

import * as JSONSchema from 'effect/JSONSchema';
import * as Schema from 'effect/Schema';
import { test } from 'vitest';

import { IdentityDid } from './identity-did';

test('identity-did', ({ expect }) => {
  const id = IdentityDid.random();

  expect(id.length).toBe(42);
  expect(IdentityDid.isValid(id)).toBe(true);
  const decoded = IdentityDid.decode(id);
  expect(decoded.length).toBe(IdentityDid.byteLength);
  expect(IdentityDid.encode(decoded)).toBe(id);
});

test('identity-did schema', ({ expect }) => {
  const id = IdentityDid.random();

  // Validates and brands a plain string.
  expect(IdentityDid.make(id)).toBe(id);
  expect(Schema.is(IdentityDid)(id)).toBe(true);
  expect(Schema.is(IdentityDid)('not-a-did')).toBe(false);

  // Rejects a correctly-prefixed, correctly-sized string that is not valid base-32.
  expect(IdentityDid.isValid(`did:halo:B${'1'.repeat(32)}`)).toBe(false);

  // Serializes to JSON Schema (a plain string type), unlike Schema.instanceOf.
  expect(() => JSONSchema.make(IdentityDid)).not.toThrow();
});
