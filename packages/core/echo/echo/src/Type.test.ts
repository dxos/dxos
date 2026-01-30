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
    test('has SchemaKindId for schema type checking', ({ expect }) => {
      // Type.isObjectSchema uses SchemaKindId to check if a schema is an object schema.
      expect(Type.isObjectSchema(Type.Obj)).toBe(true);
      expect(Type.isObjectSchema(TestSchema.Person)).toBe(true);
      expect(Type.isObjectSchema(Type.Relation)).toBe(false);
    });

    test('Schema.is validates structural compatibility only', ({ expect }) => {
      // Schema.is does structural validation (has id field).
      // It accepts both ECHO objects and plain objects with compatible structure.
      expect(Schema.is(Type.Obj)({ id: 'plain-object' })).toBe(true);
      const obj = Obj.make(TestSchema.Person, { name: 'Test' });
      expect(Schema.is(Type.Obj)(obj)).toBe(true);
    });
  });

  describe('Type.Relation', () => {
    test('has SchemaKindId for schema type checking', ({ expect }) => {
      // Type.isRelationSchema uses SchemaKindId to check if a schema is a relation schema.
      expect(Type.isRelationSchema(Type.Relation)).toBe(true);
      expect(Type.isRelationSchema(TestSchema.HasManager)).toBe(true);
      expect(Type.isRelationSchema(Type.Obj)).toBe(false);
    });

    test('Schema.is validates structural compatibility only', ({ expect }) => {
      // Schema.is does structural validation (has id field).
      // It accepts both ECHO relations and plain objects with compatible structure.
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
