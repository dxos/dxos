//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import * as Entity from './Entity';
import * as JsonSchema from './JsonSchema';
import * as Obj from './Obj';
import * as Relation from './Relation';
import { TestSchema } from './testing';
import * as Type from './Type';

describe('Type', () => {
  describe('Obj.Unknown schema', () => {
    test('Schema.is validates structural compatibility only', ({ expect }) => {
      // Schema.is does structural validation (has id field). `Obj.Unknown` IS
      // a raw Effect Schema (branded with EchoSchemaKind), so pass it directly.
      expect(Schema.is(Obj.Unknown)({ id: 'plain-object' })).toBe(true);
      const obj = Obj.make(TestSchema.Person, { name: 'Test' });
      expect(Schema.is(Obj.Unknown)(obj)).toBe(true);
    });
  });

  describe('Relation.Unknown schema', () => {
    test('Schema.is validates structural compatibility only', ({ expect }) => {
      // Schema.is does structural validation (has id field). `Relation.Unknown`
      // IS a raw Effect Schema (branded with EchoSchemaKind), so pass it directly.
      expect(Schema.is(Relation.Unknown)({ id: 'plain-object' })).toBe(true);
      const obj1 = Obj.make(TestSchema.Person, { name: 'Alice' });
      const obj2 = Obj.make(TestSchema.Person, { name: 'Bob' });
      const rel = Relation.make(TestSchema.HasManager, {
        [Relation.Source]: obj1,
        [Relation.Target]: obj2,
      });
      expect(Schema.is(Relation.Unknown)(rel)).toBe(true);
    });
  });

  describe('Type.Type meta-schema', () => {
    test('Type.Type is branded as the type entity kind', ({ expect }) => {
      // The Type.Type entity itself is an in-memory object (KindId=Object) that
      // *declares* a type-kind schema (SchemaKindId=Type).
      expect(Type.isTypeKindSchema(Type.Type)).toBe(true);
      expect(Type.isObject(Type.Type)).toBe(false);
      expect(Type.isRelation(Type.Type)).toBe(false);
    });

    test('static object/relation types are not type-kind', ({ expect }) => {
      expect(Type.isTypeKindSchema(TestSchema.Person)).toBe(false);
      expect(Type.isTypeKindSchema(TestSchema.HasManager)).toBe(false);
    });

    test('Type.getMeta(Type.Type) reports key/version of the meta-schema', ({ expect }) => {
      // `Type.getMeta` returns the entity's `ObjectMeta`. For the static
      // `Type.Type` meta-schema entity the key/version reflect its registry
      // identity. The schema-kind brand is on `[SchemaKindId]`, not in meta.
      const meta = Type.getMeta(Type.Type);
      expect(meta.key).toBe('org.dxos.type.schema');
      expect(meta.version).toBe('0.1.0');
      expect(Type.isTypeKindSchema(Type.Type)).toBe(true);
    });

    test('Type.getURI(Type.Type) returns the meta-schema DXN', ({ expect }) => {
      expect(Type.getURI(Type.Type).toString()).toBe('dxn:org.dxos.type.schema:0.1.0');
    });
  });

  describe('Type.makeObjectFromJsonSchema', () => {
    test('creates an instance branded KindId=type', ({ expect }) => {
      const entity = Type.makeObjectFromJsonSchema({
        typename: 'com.example.type.test',
        version: '0.1.0',
        jsonSchema: JsonSchema.toJsonSchema(Schema.Struct({ field: Schema.Number })),
      });
      expect((entity as any)[Entity.KindId]).toBe(Entity.Kind.Type);
      // `typename` / `version` are not direct fields on a persisted `Type.Type`;
      // they live in `ObjectMeta` (the canonical registry-provenance pair).
      // Read them via the helpers (or `Type.getMeta`).
      expect(Type.getTypename(entity)).toBe('com.example.type.test');
      expect(Type.getVersion(entity)).toBe('0.1.0');
      expect(entity.jsonSchema).toBeDefined();
    });

    test('defaults version to 0.0.0 for drafts', ({ expect }) => {
      const draft = Type.makeObjectFromJsonSchema({
        jsonSchema: JsonSchema.toJsonSchema(Schema.Struct({ field: Schema.String })),
      });
      expect(Type.getVersion(draft)).toBe('0.0.0');
      const meta = Type.getMeta(draft);
      expect(meta.key).toBeUndefined();
      expect(meta.version).toBe('0.0.0');
    });

    test('assigns a stable id', ({ expect }) => {
      const a = Type.makeObjectFromJsonSchema({ jsonSchema: JsonSchema.toJsonSchema(Schema.Struct({})) });
      const b = Type.makeObjectFromJsonSchema({ jsonSchema: JsonSchema.toJsonSchema(Schema.Struct({})) });
      expect(typeof a.id).toBe('string');
      expect(a.id).not.toBe(b.id);
    });

    test('result satisfies isType', ({ expect }) => {
      const entity = Type.makeObjectFromJsonSchema({
        jsonSchema: JsonSchema.toJsonSchema(Schema.Struct({ field: Schema.Number })),
      });
      expect(Type.isType(entity)).toBe(true);
    });
  });

  describe('Type.makeRelationFromJsonSchema', () => {
    test('embeds source/target DXNs into jsonSchema', ({ expect }) => {
      const entity = Type.makeRelationFromJsonSchema({
        typename: 'com.example.type.testRel',
        version: '0.1.0',
        jsonSchema: JsonSchema.toJsonSchema(Schema.Struct({ note: Schema.String })),
        source: TestSchema.Person,
        target: TestSchema.Organization,
      });
      expect((entity as any)[Entity.KindId]).toBe(Entity.Kind.Type);
      expect(entity.jsonSchema.entityKind).toBe(Entity.Kind.Relation);
      expect((entity.jsonSchema as any).relationSource?.$ref).toBe(Type.getURI(TestSchema.Person).toString());
      expect((entity.jsonSchema as any).relationTarget?.$ref).toBe(Type.getURI(TestSchema.Organization).toString());
    });

    test('accepts Obj.Unknown as source/target', ({ expect }) => {
      const entity = Type.makeRelationFromJsonSchema({
        jsonSchema: JsonSchema.toJsonSchema(Schema.Struct({})),
        source: Obj.Unknown,
        target: Obj.Unknown,
      });
      const unknownURI = 'dxn:org.dxos.schema.anyObject:0.0.0';
      expect((entity.jsonSchema as any).relationSource?.$ref).toBe(unknownURI);
      expect((entity.jsonSchema as any).relationTarget?.$ref).toBe(unknownURI);
    });

    test('defaults version to 0.0.0 for drafts', ({ expect }) => {
      const draft = Type.makeRelationFromJsonSchema({
        jsonSchema: JsonSchema.toJsonSchema(Schema.Struct({})),
        source: TestSchema.Person,
        target: TestSchema.Person,
      });
      expect(Type.getVersion(draft)).toBe('0.0.0');
      const meta = Type.getMeta(draft);
      expect(meta.key).toBeUndefined();
      expect(meta.version).toBe('0.0.0');
    });
  });

  describe('Obj/Relation/Entity.getType', () => {
    test('Obj.getType returns the static type entity for instances of Type.makeObject', ({ expect }) => {
      const person = Obj.make(TestSchema.Person, { name: 'Alice' });
      expect(Obj.getType(person)).toBe(TestSchema.Person);
    });

    test('Relation.getType returns the static type entity for instances of Type.makeRelation', ({ expect }) => {
      const a = Obj.make(TestSchema.Person, { name: 'A' });
      const b = Obj.make(TestSchema.Person, { name: 'B' });
      const rel = Relation.make(TestSchema.HasManager, {
        [Relation.Source]: a,
        [Relation.Target]: b,
      });
      expect(Relation.getType(rel)).toBe(TestSchema.HasManager);
    });

    test('Entity.getType narrows uniformly across object/relation instances', ({ expect }) => {
      const person = Obj.make(TestSchema.Person, { name: 'A' });
      const a = Obj.make(TestSchema.Person, { name: 'A' });
      const b = Obj.make(TestSchema.Person, { name: 'B' });
      const rel = Relation.make(TestSchema.HasManager, {
        [Relation.Source]: a,
        [Relation.Target]: b,
      });
      expect(Entity.getType(person)).toBe(TestSchema.Person);
      expect(Entity.getType(rel)).toBe(TestSchema.HasManager);
    });
  });

  describe('static type factories', () => {
    test('Type.makeObject stamps schema-kind=object', ({ expect }) => {
      expect((TestSchema.Person as any)['~@dxos/echo/SchemaKind']).toBe(Entity.Kind.Object);
      expect(Type.isObject(TestSchema.Person)).toBe(true);
    });

    test('Type.makeRelation stamps schema-kind=relation', ({ expect }) => {
      expect((TestSchema.HasManager as any)['~@dxos/echo/SchemaKind']).toBe(Entity.Kind.Relation);
      expect(Type.isRelation(TestSchema.HasManager)).toBe(true);
    });

    test('Type.getURI returns the DXN for static types', ({ expect }) => {
      expect(Type.getURI(TestSchema.Person).toString()).toBe('dxn:com.example.type.person:0.1.0');
      expect(Type.getURI(TestSchema.HasManager).toString()).toBe('dxn:com.example.type.hasManager:0.1.0');
    });
  });
});
