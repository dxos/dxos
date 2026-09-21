//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, expect, test } from 'vitest';

import { DXN, EID, EntityId } from '@dxos/keys';

import * as Type from '../../Type.ts';
import { EchoObjectSchema, getObjectEchoUri } from '../Entity/index.ts';
import { createObject } from '../Obj/index.ts';
import { Ref, getReferenceAst } from './ref.ts';

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
    Ref(Contact).pipe(Schema.is)(Ref.fromURI(EID.make({ entityId: EntityId.random() })));
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
      'id': contact.id,
      '@type': `dxn:${Type.getTypename(Contact)}:${Type.getVersion(Contact)}`,
      '@meta': {
        keys: [],
      },
      'name': 'John Doe',
      'tasks': [
        {
          '/': getObjectEchoUri(task)!.toString(),
          'target': JSON.parse(JSON.stringify(task)),
        },
      ],
    });
  });

  test('encode without inlining target', () => {
    const task = createObject(Task, { title: 'Fix bugs' });
    const contact = createObject(Contact, { name: 'John Doe', tasks: [Ref.make(task).noInline()] });

    const json = JSON.parse(JSON.stringify(contact));
    expect(json).toEqual({
      'id': contact.id,
      '@type': `dxn:${Type.getTypename(Contact)}:${Type.getVersion(Contact)}`,
      '@meta': {
        keys: [],
      },
      'name': 'John Doe',
      'tasks': [{ '/': getObjectEchoUri(task)!.toString() }],
    });
  });

  test('decode object', () => {
    const id = EntityId.random();
    const contactData = {
      id: EntityId.random(),
      name: 'John Doe',
      tasks: [{ '/': `echo:/${id}` }],
    };

    const contact = Schema.decodeUnknownSync(Type.getSchema(Contact))(contactData);
    expect(Ref.isRef(contact.tasks[0])).toEqual(true);
    expect(contact.tasks[0].uri.toString()).toEqual(`echo:/${id}`);
  });

  // A rejection message is what a remote caller gets back: `InvalidOperationInput` interpolates it
  // verbatim, and the caller cannot see its own payload in our logs.
  describe('rejection diagnostics', () => {
    const rejectionMessage = (value: unknown, options?: { readonly reportInput: true }): string => {
      try {
        Schema.decodeUnknownSync(Schema.toType(Schema.Struct({ tasks: Ref(Task) })))({ tasks: value } as any, options);
      } catch (err: any) {
        return err.message;
      }
      throw new Error('expected the decode to fail');
    };

    test('names the expected type and the field', ({ expect }) => {
      const message = rejectionMessage(42);

      expect(message).toContain('["tasks"]');

      // Without an `identifier` annotation Effect renders a declaration as `<Declaration>`, which
      // tells a caller only what shape its value is not.
      expect(message).not.toContain('<Declaration>');
      expect(message).toContain('Ref<');
      expect(message).toContain(Type.getTypename(Task));
    });

    test('reports the offending value under `reportInput`', ({ expect }) => {
      // The value distinguishes "you passed a number" from "you passed an unresolvable envelope" —
      // the two mistakes a remote caller actually makes. Operation input validation turns this on;
      // see `validateOperationInput` in `@dxos/compute`.
      expect(rejectionMessage(42, { reportInput: true })).toContain('42');
      expect(rejectionMessage({ '/': 'not-a-uri' }, { reportInput: true })).toContain('not-a-uri');
    });
  });
});
