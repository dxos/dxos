//
// Copyright 2025 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { encodeReference, Reference } from '@dxos/echo-protocol';

import { log } from '@dxos/log';
import { Schema } from 'effect';
import { EchoObject } from '../ast';
import { create, ObjectId } from '../object';
import { makeRef, refFromDXN, Ref } from './ref';
import { DXN } from '@dxos/keys';

const Task = Schema.Struct({
  title: Schema.optional(Schema.String),
}).pipe(
  EchoObject({
    typename: 'example.com/type/Task',
    version: '0.1.0',
  }),
);

type Task = Schema.Schema.Type<typeof Task>;

const Contact = Schema.Struct({
  name: Schema.String,
  email: Schema.optional(Schema.String),
  tasks: Schema.mutable(Schema.Array(Ref(Task))),
}).pipe(
  EchoObject({
    typename: 'example.com/type/Contact',
    version: '0.1.0',
  }),
);

type Contact = Schema.Schema.Type<typeof Contact>;

describe('Ref', () => {
  test('Schema is', () => {
    Ref(Contact).pipe(Schema.is)(refFromDXN(DXN.parse(`dxn:echo:@:${ObjectId.random()}`)));
  });

  test('encode with inlined target', () => {
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

  test('encode without inlining target', () => {
    const task = create(Task, { title: 'Fix bugs' });
    const contact = create(Contact, { name: 'John Doe', tasks: [makeRef(task).noInline()] });

    const json = JSON.parse(JSON.stringify(contact));
    expect(json).toEqual({
      id: contact.id,
      '@type': `dxn:type:${Contact.typename}:${Contact.version}`,
      name: 'John Doe',
      tasks: [{ ...encodeReference(Reference.fromDXN(makeRef(task).dxn)) }],
    });
  });

  test('decode object', () => {
    const id = ObjectId.random();
    const contactData = {
      id: ObjectId.random(),
      name: 'John Doe',
      tasks: [{ '/': `dxn:echo:@:${id}` }],
    };

    const contact = Contact.pipe(Schema.decodeUnknownSync)(contactData);
    expect(Ref.isRef(contact.tasks[0])).toEqual(true);
    expect(contact.tasks[0].dxn.toString()).toEqual(`dxn:echo:@:${id}`);
  });
});
