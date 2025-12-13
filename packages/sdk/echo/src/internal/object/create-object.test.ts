//
// Copyright 2025 DXOS.org
//

import { inspect } from 'util';

import * as Schema from 'effect/Schema';
import { describe, expect, test } from 'vitest';

import { DXN } from '@dxos/keys';

import { Relation } from '../../index';
import { TestSchema } from '../../testing';
import { getSchemaDXN, getTypeDXN, isInstanceOf } from '../annotations';
import { ATTR_RELATION_SOURCE, ATTR_RELATION_TARGET } from '../entities';
import { ATTR_META, ATTR_TYPE, getSchema } from '../types';

import { createObject } from './create-object';
import { objectToJSON } from './json-serializer';

describe('create (static version)', () => {
  test('defaults', ({ expect }) => {
    const Contact = Schema.Struct({
      name: Schema.String.pipe(
        Schema.optional,
        Schema.withConstructorDefault(() => 'Anonymous'),
      ),
      email: Schema.String.pipe(Schema.optional),
    });

    const obj = Contact.make({});
    expect(obj.name).toBe('Anonymous');
  });

  test('create static object', () => {
    const contact = createObject(TestSchema.Person, {
      name: 'Bot',
      email: 'bot@example.com',
    });

    expect(contact.id).toBeDefined();
    expect(contact.name).toBe('Bot');
    expect(contact.email).toBe('bot@example.com');
    expect((contact as any)['@type']).toBeUndefined();
    expect(getTypeDXN(contact)?.toString()).toBe(getSchemaDXN(TestSchema.Person)!.toString());
    expect(isInstanceOf(TestSchema.Person, contact)).toBe(true);
  });

  test('JSON encoding', () => {
    const contact = createObject(TestSchema.Person, {
      name: 'Bot',
      email: 'bot@example.com',
    });

    const json = JSON.parse(JSON.stringify(contact));
    expect(json).toEqual({
      id: contact.id,
      '@type': DXN.fromTypenameAndVersion(TestSchema.Person.typename, TestSchema.Person.version).toString(),
      '@meta': {
        keys: [],
      },
      name: 'Bot',
      email: 'bot@example.com',
    });
    expect(objectToJSON(contact)).toStrictEqual(json);
  });

  test('JSON encoding with relation', () => {
    const person1 = createObject(TestSchema.Person, {
      name: 'Alice',
      email: 'alice@example.com',
    });
    const person2 = createObject(TestSchema.Person, {
      name: 'Bob',
      email: 'bob@example.com',
    });

    const manager = createObject(TestSchema.HasManager, {
      [Relation.Source]: person1 as any,
      [Relation.Target]: person2 as any,
    });

    const json = JSON.parse(JSON.stringify(manager));
    expect(json).toEqual({
      id: manager.id,
      [ATTR_TYPE]: DXN.fromTypenameAndVersion(TestSchema.HasManager.typename, TestSchema.HasManager.version).toString(),
      [ATTR_RELATION_SOURCE]: DXN.fromLocalObjectId(person1.id).toString(),
      [ATTR_RELATION_TARGET]: DXN.fromLocalObjectId(person2.id).toString(),
      [ATTR_META]: {
        keys: [],
      },
    });
  });

  test('getSchema', () => {
    const contact = createObject(TestSchema.Person, {
      name: 'Bot',
      email: 'bot@example.com',
    });

    expect(getSchema(contact)).toBe(TestSchema.Person);
  });

  test('inspect', () => {
    const contact = createObject(TestSchema.Person, {
      name: 'Bot',
      email: 'bot@example.com',
    });

    const text = inspect(contact);
    expect(text).toContain('Bot');
    expect(text).toContain('bot@example.com');
    expect(text).toContain('example.com/type/Person');
    expect(text).toContain('0.1.0');
  });
});
