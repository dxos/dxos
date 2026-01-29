//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import * as Obj from './Obj';
import * as Relation from './Relation';
import { TestSchema } from './testing';
import * as Type from './Type';

describe('Type', () => {
  describe('Type.Obj', () => {
    test('has typename and version properties', ({ expect }) => {
      expect(Type.Obj.typename).toBe('dxos.org/schema/AnyObject');
      expect(Type.Obj.version).toBe('0.0.0');
    });

    test('has SchemaKindId for schema type checking', ({ expect }) => {
      // Type.Entity.isObject uses SchemaKindId to check if a schema is an object schema.
      expect(Type.Entity.isObject(Type.Obj)).toBe(true);
      expect(Type.Entity.isObject(TestSchema.Person)).toBe(true);
      expect(Type.Entity.isObject(Type.Relation)).toBe(false);
    });

    test('Schema.is validates structural compatibility only', ({ expect }) => {
      // Schema.is does structural validation (has id field).
      // It accepts both ECHO objects and plain objects with compatible structure.
      // NOTE: Schema.is cannot validate KindId brand because Effect Schema normalizes
      // values to plain objects before validation, stripping proxy properties.
      // Use Obj.isObject() for proper ECHO instance type guards.
      expect(Schema.is(Type.Obj)({ id: 'plain-object' })).toBe(true);
      const obj = Obj.make(TestSchema.Person, { name: 'Test' });
      expect(Schema.is(Type.Obj)(obj)).toBe(true);
    });
  });

  describe('Type.Relation', () => {
    test('has typename and version properties', ({ expect }) => {
      expect(Type.Relation.typename).toBe('dxos.org/schema/AnyRelation');
      expect(Type.Relation.version).toBe('0.0.0');
    });

    test('has SchemaKindId for schema type checking', ({ expect }) => {
      // Type.Entity.isRelation uses SchemaKindId to check if a schema is a relation schema.
      expect(Type.Entity.isRelation(Type.Relation)).toBe(true);
      expect(Type.Entity.isRelation(TestSchema.HasManager)).toBe(true);
      expect(Type.Entity.isRelation(Type.Obj)).toBe(false);
    });

    test('Schema.is validates structural compatibility only', ({ expect }) => {
      // Schema.is does structural validation (has id field).
      // It accepts both ECHO relations and plain objects with compatible structure.
      // NOTE: Schema.is cannot validate KindId brand because Effect Schema normalizes
      // values to plain objects before validation, stripping proxy properties.
      // Use Relation.isRelation() for proper ECHO instance type guards.
      expect(Schema.is(Type.Relation)({ id: 'plain-object' })).toBe(true);
      const obj1 = Obj.make(TestSchema.Person, { name: 'Alice' });
      const obj2 = Obj.make(TestSchema.Person, { name: 'Bob' });
      const rel = Relation.make(TestSchema.HasManager, {
        [Relation.Source]: obj1,
        [Relation.Target]: obj2,
      });
      expect(Schema.is(Type.Relation)(rel)).toBe(true);
    });
  });
});
