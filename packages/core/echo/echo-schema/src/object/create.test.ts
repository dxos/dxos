//
// Copyright 2025 DXOS.org
//

import { Schema as S } from 'effect';
import { describe, expect, test } from 'vitest';

import { DXN } from '@dxos/keys';

import { create } from './create';
import { serializeStatic } from './json-serializer';
import { getTypename } from './typename';
import { getSchema, getSchemaDXN } from '../ast';
import { Testing } from '../testing';
import { isInstanceOf } from '../types';

describe('create (static version)', () => {
  test('defaults', ({ expect }) => {
    const Contact = S.Struct({
      name: S.String.pipe(
        S.optional,
        S.withConstructorDefault(() => 'Anonymous'),
      ),
      email: S.String.pipe(S.optional),
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

  test('getSchema', () => {
    const contact = create(Testing.Contact, {
      name: 'Bot',
      email: 'bot@example.com',
    });

    expect(getSchema(contact)).toBe(Testing.Contact);
  });
});
