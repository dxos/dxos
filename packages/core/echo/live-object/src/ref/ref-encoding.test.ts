//
// Copyright 2025 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { encodeReference, Reference } from '@dxos/echo-protocol';
import { createStatic, Ref, S, TypedObject } from '@dxos/echo-schema';

import { makeRef } from './ref';

export class Task extends TypedObject({
  typename: 'example.com/type/Task',
  version: '0.1.0',
})({ title: S.optional(S.String) }) {}

export class Contact extends TypedObject({
  typename: 'example.com/type/Contact',
  version: '0.1.0',
})({
  name: S.String,
  email: S.optional(S.String),
  tasks: S.mutable(S.Array(Ref(Task))),
}) {}

describe('ref encoding', () => {
  test('static object', () => {
    const task = createStatic(Task, { title: 'Fix bugs' });
    const contact = createStatic(Contact, { name: 'John Doe', tasks: [makeRef(task)] });

    const json = JSON.parse(JSON.stringify(contact));
    expect(json).toEqual({
      id: contact.id,
      '@type': `dxn:type:${Contact.typename}:${Contact.version}`,
      tasks: [
        {
          ...encodeReference(Reference.fromDXN(makeRef(task).dxn)),
          target: JSON.parse(JSON.stringify(task)),
        },
      ],
    });
  });
});
