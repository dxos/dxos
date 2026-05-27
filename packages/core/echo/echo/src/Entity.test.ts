//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import * as Entity from './Entity';
import * as Obj from './Obj';
import * as Relation from './Relation';
import * as Type from './Type';
import { TestSchema } from './testing';

const makeObject = () =>
  Obj.make(TestSchema.Person, {
    name: 'Test',
    username: 'test',
    email: 'test@example.com',
    tasks: [],
  });

const makeRelation = (obj: TestSchema.Person) =>
  Relation.make(TestSchema.HasManager, { [Relation.Source]: obj, [Relation.Target]: obj });

describe('Entity', () => {
  test('Entity.Unknown accepts any object or relation', () => {
    const obj = makeObject();
    const rel = makeRelation(obj);
    const doSomething = (entity: Entity.Unknown) => entity;
    expect(doSomething(obj)).toBe(obj);
    expect(doSomething(rel)).toBe(rel);
  });

  // `isEntity` is a bare brand check (`[KindId] !== undefined`). All three entity
  // kinds — objects, relations, and type entities — carry the brand, so all three
  // are recognised as entities. (Type entities brand with `EntityKind.Type`.)
  describe('isEntity / isSnapshot', () => {
    test('object instance is an entity', () => {
      const obj = makeObject();
      expect(Entity.isEntity(obj)).toBe(true);
      expect(Entity.isSnapshot(obj)).toBe(false);
    });

    test('relation instance is an entity', () => {
      const rel = makeRelation(makeObject());
      expect(Entity.isEntity(rel)).toBe(true);
      expect(Entity.isSnapshot(rel)).toBe(false);
    });

    test('type entity is an entity', () => {
      expect(Entity.isEntity(TestSchema.Person)).toBe(true);
      expect(Entity.isSnapshot(TestSchema.Person)).toBe(false);
    });

    test('non-entities are rejected', () => {
      expect(Entity.isEntity(null)).toBe(false);
      expect(Entity.isEntity({})).toBe(false);
      expect(Entity.isEntity({ id: 'x' })).toBe(false);
      expect(Entity.isEntity('string')).toBe(false);
    });
  });

  // Object and relation instances behave identically across the Entity.* accessor
  // surface: these accessors are written for runtime instances and read the
  // instance's identity, type pointer and metadata.
  describe.each([
    ['object', () => makeObject(), 'com.example.type.person'],
    ['relation', () => makeRelation(makeObject()), 'com.example.type.hasManager'],
  ] as const)('instance accessors (%s)', (_label, make, typename) => {
    test('getURI returns an echo URI', () => {
      const entity = make();
      expect(Entity.getURI(entity)).toMatch(/^echo:/);
    });

    test('getTypename returns the typename', () => {
      expect(Entity.getTypename(make())).toBe(typename);
    });

    test('getTypeURI returns the type DXN', () => {
      expect(Entity.getTypeURI(make())).toBe(`dxn:${typename}:0.1.0`);
    });

    test('getType resolves back to the type entity', () => {
      const type = Entity.getType(make());
      expect(type).toBeDefined();
      expect(Type.getTypename(type!)).toBe(typename);
    });

    test('getMeta returns metadata', () => {
      expect(Entity.getMeta(make())).toBeDefined();
    });

    test('isDeleted is false for a live entity', () => {
      expect(Entity.isDeleted(make())).toBe(false);
    });

    test('toJSON serializes the entity', () => {
      const json = Entity.toJSON(make());
      expect(json).toMatchObject({ '@type': expect.stringContaining(typename) });
    });
  });

  // Type entities pass `isEntity`, but the Entity.* accessors above are oriented at
  // object/relation *instances* and are NOT meaningful for a type entity — its
  // "type" is the meta-schema, not a referenced type. Callers that hold a type
  // entity must use the `Type.*` accessors instead.
  describe('type entity', () => {
    test('shared accessors that work', () => {
      expect(Entity.isEntity(TestSchema.Person)).toBe(true);
      expect(Entity.getMeta(TestSchema.Person)).toBeDefined();
      expect(Entity.isDeleted(TestSchema.Person)).toBe(false);
    });

    test('instance-oriented accessors are not meaningful for a type entity', () => {
      // No instance identity / type pointer to read.
      expect(Entity.getTypename(TestSchema.Person)).toBeUndefined();
      expect(Entity.getTypeURI(TestSchema.Person)).toBeUndefined();
      expect(Entity.getType(TestSchema.Person)).toBeUndefined();
      // These throw rather than return undefined — use the Type.* accessors below.
      expect(() => Entity.getURI(TestSchema.Person)).toThrow();
      expect(() => Entity.toJSON(TestSchema.Person)).toThrow();
    });

    test('Type.* accessors are the correct API for type entities', () => {
      expect(Type.isType(TestSchema.Person)).toBe(true);
      expect(Type.isObject(TestSchema.Person)).toBe(true);
      expect(Type.isRelation(TestSchema.HasManager)).toBe(true);
      expect(Type.getURI(TestSchema.Person)).toBe('dxn:com.example.type.person:0.1.0');
      expect(Type.getTypename(TestSchema.Person)).toBe('com.example.type.person');
      expect(Type.getVersion(TestSchema.Person)).toBe('0.1.0');
    });
  });
});
