//
// Copyright 2025 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { encodeReference, Reference } from '@dxos/echo-protocol';
import { createStatic, Ref, type Ref$, S, TypedObject } from '@dxos/echo-schema';

import { makeRef } from './ref-impl';

describe('ref encoding', () => {
  test('static object', () => {
    const task = createStatic(Task, { title: 'Fix bugs' });
    const contact = createStatic(Contact, { tasks: [makeRef(task)] });

    const json = JSON.parse(JSON.stringify(contact));
    expect(json).toEqual({
      id: contact.id,
      '@type': `dxn:type:${Contact.typename}:${Contact.version}`,
      tasks: [encodeReference(Reference.fromDXN(makeRef(task).dxn))],
    });
  });
});

export class Contact extends TypedObject({
  typename: 'example.com/type/Contact',
  version: '0.1.0',
})({
  tasks: S.suspend((): S.mutable<S.Array$<Ref$<Task>>> => S.mutable(S.Array(Ref(Task)))),
}) {}

export class Task extends TypedObject({
  typename: 'example.com/type/Task',
  version: '0.1.0',
})({ title: S.optional(S.String) }) {}
