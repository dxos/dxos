//
// Copyright 2026 DXOS.org
//

import { describe, test, vi } from 'vitest';

import { ObjectId } from './object-id';

describe('ObjectId', () => {
  describe('isValid', () => {
    test('accepts a randomly-generated id', ({ expect }) => {
      const id = ObjectId.random();
      expect(ObjectId.isValid(id)).toBe(true);
    });

    test('rejects malformed strings', ({ expect }) => {
      expect(ObjectId.isValid('')).toBe(false);
      expect(ObjectId.isValid('not-a-ulid')).toBe(false);
      // Wrong leading char (must be 0-7).
      expect(ObjectId.isValid('8AAAAAAAAAAAAAAAAAAAAAAAAA')).toBe(false);
    });
  });

  describe('deterministic', () => {
    test('returns the same id for the same seeds', ({ expect }) => {
      const first = ObjectId.deterministic('org.dxos.type.person', '0.1.0');
      const second = ObjectId.deterministic('org.dxos.type.person', '0.1.0');
      expect(first).toBe(second);
    });

    test('returns different ids for different seeds', ({ expect }) => {
      const person = ObjectId.deterministic('org.dxos.type.person', '0.1.0');
      const organization = ObjectId.deterministic('org.dxos.type.organization', '0.1.0');
      expect(person).not.toBe(organization);
    });

    test('returns different ids when version differs', ({ expect }) => {
      const v1 = ObjectId.deterministic('org.dxos.type.person', '0.1.0');
      const v2 = ObjectId.deterministic('org.dxos.type.person', '0.2.0');
      expect(v1).not.toBe(v2);
    });

    test('output passes ObjectId.isValid', ({ expect }) => {
      const id = ObjectId.deterministic('org.dxos.type.person', '0.1.0');
      expect(ObjectId.isValid(id)).toBe(true);
    });

    test('accepts numeric seeds', ({ expect }) => {
      const id = ObjectId.deterministic('prefix', 42, 'suffix');
      expect(ObjectId.isValid(id)).toBe(true);
    });

    test('does not call crypto.getRandomValues', ({ expect }) => {
      // Workerd forbids `crypto.getRandomValues()` in global scope; deterministic() must therefore
      // never reach for the platform RNG. Verify by spying on the global.
      const spy = vi.spyOn(globalThis.crypto, 'getRandomValues');
      try {
        ObjectId.deterministic('org.dxos.type.person', '0.1.0');
        expect(spy).not.toHaveBeenCalled();
      } finally {
        spy.mockRestore();
      }
    });

    test('seed-component separator avoids collisions across adjacent inputs', ({ expect }) => {
      // ('ab', 'c') vs ('a', 'bc') must hash differently — guards against naive
      // concatenation that would conflate adjacent string seeds.
      const left = ObjectId.deterministic('ab', 'c');
      const right = ObjectId.deterministic('a', 'bc');
      expect(left).not.toBe(right);
    });
  });
});
