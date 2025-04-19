//
// Copyright 2025 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { createStatic } from './create';
import { serializeStatic } from './json-serializer';
import { getTypename } from './typename';
import { getSchema } from '../ast';
import { Testing } from '../testing';
import { getSchemaDXN, isInstanceOf } from '../types';

describe('create (static version)', () => {
  test('create static object', () => {
    const contact = createStatic(Testing.Contact, {
      name: 'John',
      email: 'john@example.com',
    });

    expect(contact.id).toBeDefined();
    expect(contact.name).toBe('John');
    expect(contact.email).toBe('john@example.com');
    expect(getTypename(contact)).toBe(getSchemaDXN(Testing.Contact)!.toString());
    expect((contact as any)['@type']).toBeUndefined();
    expect(isInstanceOf(Testing.Contact, contact)).toBe(true);
  });

  test('json encoding', () => {
    const contact = createStatic(Testing.Contact, {
      name: 'John',
      email: 'john@example.com',
    });

    const json = JSON.parse(JSON.stringify(contact));
    expect(json).toEqual({
      id: contact.id,
      '@type': `dxn:type:${Testing.Contact.typename}:${Testing.Contact.version}`,
      name: 'John',
      email: 'john@example.com',
    });
    expect(serializeStatic(contact)).toStrictEqual(json);
  });

  test('getSchema', () => {
    const contact = createStatic(Testing.Contact, {
      name: 'John',
      email: 'john@example.com',
    });

    expect(getSchema(contact)).toBe(Testing.Contact);
  });
});
