//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';
import { describe, expect, test } from 'vitest';

import { DXN, ObjectId } from '@dxos/keys';

import { EchoObject, create, getObjectDXN } from '../object';

import { Ref, getReferenceAst } from './ref';

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
    Ref(Contact).pipe(Schema.is)(Ref.fromDXN(DXN.parse(`dxn:echo:@:${ObjectId.random()}`)));
  });

  test('ref ast', () => {
    const ref = Ref(Task);
    expect(ref.ast._tag).toEqual('Declaration');
    const refAst = getReferenceAst(ref.ast);
    expect(refAst).toEqual({ typename: Task.typename, version: Task.version });
  });

  // TODO(dmaretskyi): Figure out how to expose this in the API.
  test.skip('encode with inlined target', () => {
    const task = create(Task, { title: 'Fix bugs' });
    const contact = create(Contact, { name: 'John Doe', tasks: [Ref.make(task)] });

    const json = JSON.parse(JSON.stringify(contact));
    expect(json).toEqual({
      id: contact.id,
      '@type': `dxn:type:${Contact.typename}:${Contact.version}`,
      '@meta': {
        keys: [],
      },
      name: 'John Doe',
      tasks: [
        {
          '/': getObjectDXN(task as any)!.toString(),
          target: JSON.parse(JSON.stringify(task)),
        },
      ],
    });
  });

  test('encode without inlining target', () => {
    const task = create(Task, { title: 'Fix bugs' });
    const contact = create(Contact, { name: 'John Doe', tasks: [Ref.make(task).noInline()] });

    const json = JSON.parse(JSON.stringify(contact));
    expect(json).toEqual({
      id: contact.id,
      '@type': `dxn:type:${Contact.typename}:${Contact.version}`,
      '@meta': {
        keys: [],
      },
      name: 'John Doe',
      tasks: [{ '/': getObjectDXN(task)!.toString() }],
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
