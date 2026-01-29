//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import * as Obj from './Obj';
import { TestSchema } from './testing';

describe('Obj', () => {
  describe('Unknown', () => {
    test('Unknown type exists and is an interface', ({ expect }) => {
      // Type-level test: Unknown is the base type for all ECHO objects
      // This test verifies the type exists and can be used
      const checkType = (obj: Obj.Unknown) => obj.id;
      expect(typeof checkType).toBe('function');
    });

    test('AnyProps type allows arbitrary properties', ({ expect }) => {
      // Create an actual ECHO object and verify AnyProps works
      const obj = Obj.make(TestSchema.Expando, { customField: 'value', anotherField: 123 });
      const anyPropsObj: Obj.Any = obj;

      expect(anyPropsObj.customField).toBe('value');
      expect(anyPropsObj.anotherField).toBe(123);
    });
  });

  describe('make', () => {
    test('creates object with Expando schema', ({ expect }) => {
      const obj = Obj.make(TestSchema.Expando, { name: 'test' });
      expect(obj.id).toBeDefined();
      expect((obj as any).name).toBe('test');
    });

    test('created object satisfies Unknown type', ({ expect }) => {
      const obj = Obj.make(TestSchema.Expando, { name: 'test' });
      const unknownObj: Obj.Unknown = obj;
      expect(unknownObj.id).toBeDefined();
    });
  });

  describe('isObject', () => {
    test('returns true for ECHO objects', ({ expect }) => {
      const obj = Obj.make(TestSchema.Expando, { name: 'test' });
      expect(Obj.isObject(obj)).toBe(true);
    });

    test('returns false for non-ECHO objects', ({ expect }) => {
      expect(Obj.isObject({})).toBe(false);
      expect(Obj.isObject(null)).toBe(false);
      expect(Obj.isObject('string')).toBe(false);
    });
  });
});
