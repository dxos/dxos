//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import * as Entity from './Entity';
import * as Obj from './Obj';
import * as Relation from './Relation';
import { TestSchema } from './testing';
import * as Type from './Type';

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

  // Type entities are first-class entities: the Entity.* accessors work on them too.
  // `getURI`/`getTypename` return the type's OWN identity, while `getType`/`getTypeURI`
  // (which mean "the type this entity is an instance of") resolve to the meta-type
  // `Type.Type`.
  describe('type entity', () => {
    test('isEntity / getMeta / isDeleted', () => {
      expect(Entity.isEntity(TestSchema.Person)).toBe(true);
      expect(Entity.getMeta(TestSchema.Person)).toBeDefined();
      expect(Entity.isDeleted(TestSchema.Person)).toBe(false);
    });

    test('getURI / getTypename return the type entity’s own identity', () => {
      expect(Entity.getURI(TestSchema.Person)).toBe('dxn:com.example.type.person:0.1.0');
      expect(Entity.getTypename(TestSchema.Person)).toBe('com.example.type.person');
    });

    test('getType / getTypeURI resolve to the meta-type (Type.Type)', () => {
      expect(Entity.getType(TestSchema.Person)).toBe(Type.Type);
      expect(Entity.getTypeURI(TestSchema.Person)).toBe('dxn:org.dxos.type.schema:0.1.0');
    });

    test('Entity.* and Type.* agree on type identity', () => {
      expect(Entity.getURI(TestSchema.Person)).toBe(Type.getURI(TestSchema.Person));
      expect(Entity.getTypename(TestSchema.Person)).toBe(Type.getTypename(TestSchema.Person));
      expect(Type.isType(TestSchema.Person)).toBe(true);
      expect(Type.isObject(TestSchema.Person)).toBe(true);
      expect(Type.isRelation(TestSchema.HasManager)).toBe(true);
      expect(Type.getVersion(TestSchema.Person)).toBe('0.1.0');
    });
  });
});
