//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, expect, test } from 'vitest';

import { EchoURI, ObjectId, DXN } from '@dxos/keys';

import * as Type from '../../Type';
import { EchoObjectSchema, getObjectEchoUri } from '../Entity';
import { createObject } from '../Obj';
import { Ref, getReferenceAst } from './ref';

const Task = Schema.Struct({
  title: Schema.optional(Schema.String),
}).pipe(EchoObjectSchema(DXN.make('com.example.type.task', '0.1.0')));

type Task = Type.InstanceType<typeof Task>;

const Contact = Schema.Struct({
  name: Schema.String,
  email: Schema.optional(Schema.String),
  tasks: Schema.Array(Ref(Task)),
}).pipe(EchoObjectSchema(DXN.make('com.example.type.person', '0.1.0')));

type Contact = Type.InstanceType<typeof Contact>;

describe('Ref', () => {
  test('Schema is', () => {
    Ref(Contact).pipe(Schema.is)(Ref.fromURI(EchoURI.make({ objectId: ObjectId.random() })));
  });

  test('ref ast', () => {
    const ref = Ref(Task);
    expect(ref.ast._tag).toEqual('Declaration');
    const refAst = getReferenceAst(ref.ast);
    expect(refAst).toEqual({ typename: Type.getTypename(Task), version: Type.getVersion(Task) });
  });

  // TODO(dmaretskyi): Figure out how to expose this in the API.
  test.skip('encode with inlined target', () => {
    const task = createObject(Task, { title: 'Fix bugs' });
    const contact = createObject(Contact, { name: 'John Doe', tasks: [Ref.make(task)] });

    const json = JSON.parse(JSON.stringify(contact));
    expect(json).toEqual({
      id: contact.id,
      '@type': `dxn:${Type.getTypename(Contact)}:${Type.getVersion(Contact)}`,
      '@meta': {
        keys: [],
      },
      name: 'John Doe',
      tasks: [
        {
          '/': getObjectEchoUri(task)!.toString(),
          target: JSON.parse(JSON.stringify(task)),
        },
      ],
    });
  });

  test('encode without inlining target', () => {
    const task = createObject(Task, { title: 'Fix bugs' });
    const contact = createObject(Contact, { name: 'John Doe', tasks: [Ref.make(task).noInline()] });

    const json = JSON.parse(JSON.stringify(contact));
    expect(json).toEqual({
      id: contact.id,
      '@type': `dxn:${Type.getTypename(Contact)}:${Type.getVersion(Contact)}`,
      '@meta': {
        keys: [],
      },
      name: 'John Doe',
      tasks: [{ '/': getObjectEchoUri(task)!.toString() }],
    });
  });

  test('decode object', () => {
    const id = ObjectId.random();
    const contactData = {
      id: ObjectId.random(),
      name: 'John Doe',
      tasks: [{ '/': `dxn:echo:@:${id}` }],
    };

    const contact = Type.getSchema(Contact).pipe(Schema.decodeUnknownSync)(contactData);
    expect(Ref.isRef(contact.tasks[0])).toEqual(true);
    expect(contact.tasks[0].uri.toString()).toEqual(`dxn:echo:@:${id}`);
  });
});
