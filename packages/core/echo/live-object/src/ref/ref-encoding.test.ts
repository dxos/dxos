//
// Copyright 2025 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { encodeReference, Reference } from '@dxos/echo-protocol';
import { EchoObject, create, Ref, S } from '@dxos/echo-schema';

import { makeRef } from './ref';

const Task = S.Struct({
  title: S.optional(S.String),
}).pipe(
  EchoObject({
    typename: 'example.com/type/Task',
    version: '0.1.0',
  }),
);

type Task = S.Schema.Type<typeof Task>;

const Contact = S.Struct({
  name: S.String,
  email: S.optional(S.String),
  tasks: S.mutable(S.Array(Ref(Task))),
}).pipe(
  EchoObject({
    typename: 'example.com/type/Contact',
    version: '0.1.0',
  }),
);

type Contact = S.Schema.Type<typeof Contact>;

describe('ref encoding', () => {
  test('static object', () => {
    const task = create(Task, { title: 'Fix bugs' });
    const contact = create(Contact, { name: 'John Doe', tasks: [makeRef(task)] });

    const json = JSON.parse(JSON.stringify(contact));
    expect(json).toEqual({
      id: contact.id,
      '@type': `dxn:type:${Contact.typename}:${Contact.version}`,
      name: 'John Doe',
      tasks: [
        {
          ...encodeReference(Reference.fromDXN(makeRef(task).dxn)),
          target: JSON.parse(JSON.stringify(task)),
        },
      ],
    });
  });
});
