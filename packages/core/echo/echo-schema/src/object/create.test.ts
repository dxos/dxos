import { describe, expect, test } from 'vitest';
import { Contact } from '../testing/schema';
import { createStatic } from './create';
import { getTypename } from './typename';
import { getSchemaDXN, isInstanceOf } from '../types';
import { getSchema } from '../ast';

describe('create (static version)', () => {
  test('create static object', () => {
    const contact = createStatic(Contact, {
      name: 'John',
      email: 'john@example.com',
    });

    expect(contact.id).toBeDefined();
    expect(contact.name).toBe('John');
    expect(contact.email).toBe('john@example.com');
    expect(getTypename(contact)).toBe(getSchemaDXN(Contact)!.toString());
    expect((contact as any)['@type']).toBeUndefined();
    expect(isInstanceOf(Contact, contact)).toBe(true);
  });

  test('json encoding', () => {
    const contact = createStatic(Contact, {
      name: 'John',
      email: 'john@example.com',
    });

    const json = JSON.parse(JSON.stringify(contact));
    expect(json).toEqual({
      id: contact.id,
      '@type': `dxn:type:${Contact.typename}:${Contact.version}`,
      name: 'John',
      email: 'john@example.com',
    });
  });

  test('getSchema', () => {
    const contact = createStatic(Contact, {
      name: 'John',
      email: 'john@example.com',
    });

    expect(getSchema(contact)).toBe(Contact);
  });
});