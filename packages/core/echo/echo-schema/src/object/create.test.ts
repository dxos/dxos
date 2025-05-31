//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';
import { inspect } from 'util';
import { describe, expect, test } from 'vitest';

import { DXN } from '@dxos/keys';

import { create } from './create';
import { serializeStatic } from './json-serializer';
import { getTypename } from './typename';
import { getSchema, getSchemaDXN } from '../ast';
import { Testing } from '../testing';
import { isInstanceOf } from '../types';
import { RelationSourceId } from './relation';
import { RelationTargetId } from './relation';

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
    const contact = create(Testing.Contact, {
      name: 'Bot',
      email: 'bot@example.com',
    });

    expect(contact.id).toBeDefined();
    expect(contact.name).toBe('Bot');
    expect(contact.email).toBe('bot@example.com');
    expect((contact as any)['@type']).toBeUndefined();
    expect(getTypename(contact)).toBe(getSchemaDXN(Testing.Contact)!.toString());
    expect(isInstanceOf(Testing.Contact, contact)).toBe(true);
  });

  test('JSON encoding', () => {
    const contact = create(Testing.Contact, {
      name: 'Bot',
      email: 'bot@example.com',
    });

    const json = JSON.parse(JSON.stringify(contact));
    expect(json).toEqual({
      id: contact.id,
      '@type': DXN.fromTypenameAndVersion(Testing.Contact.typename, Testing.Contact.version).toString(),
      name: 'Bot',
      email: 'bot@example.com',
    });
    expect(serializeStatic(contact)).toStrictEqual(json);
  });

  test('JSON encoding with relation', () => {
    const contactA = create(Testing.Contact, {
      name: 'Bot',
      email: 'bot@example.com',
    });
    const contactB = create(Testing.Contact, {
      name: 'Bot',
      email: 'bot@example.com',
    });
    const hasManager = create(Testing.HasManager, {
      [RelationSourceId]: contactA,
      [RelationTargetId]: contactB,
    });

    const json = JSON.parse(JSON.stringify(hasManager));
    expect(json).toEqual({
      id: hasManager.id,
      '@type': DXN.fromTypenameAndVersion(Testing.HasManager.typename, Testing.HasManager.version).toString(),
      '@relationSource': DXN.fromLocalObjectId(contactA.id).toString(),
      '@relationTarget': DXN.fromLocalObjectId(contactB.id).toString(),
    });
  });

  test('getSchema', () => {
    const contact = create(Testing.Contact, {
      name: 'Bot',
      email: 'bot@example.com',
    });

    expect(getSchema(contact)).toBe(Testing.Contact);
  });

  test('inspect', () => {
    const contact = create(Testing.Contact, {
      name: 'Bot',
      email: 'bot@example.com',
    });

    // console.log(contact);

    const text = inspect(contact);
    expect(text).toContain('Bot');
    expect(text).toContain('bot@example.com');
    expect(text).toContain('example.com/type/Contact');
    expect(text).toContain('0.1.0');
  });
});
