//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, expect, test } from 'vitest';

import { DXN, EchoURI } from '@dxos/keys';

import * as Obj from '../../Obj';
import { TestSchema } from '../../testing';
import * as Type from '../../Type';
import { getSchemaURI, getSchemaTypename, getTypeURI, getTypename } from '../Annotation';
import { getMetaChecked } from '../common/api';
import { makeObject } from '../common/proxy';
import { ATTR_TYPE, EntityKind, KindId, MetaId, TypeId, getSchema } from '../common/types';
import { RelationSourceId, RelationTargetId, getObjectEchoUri } from '../Entity';
import { Ref, StaticRefResolver } from '../Ref';
import { createObject } from './create-object';
import { objectFromJSON, objectToJSON } from './json-serializer';

describe('Object JSON serializer', () => {
  test('should serialize and deserialize object', async () => {
    const contact = makeObject(TestSchema.Person, { name: 'Alice' });
    Obj.update(contact, (contact) => {
      getMetaChecked(contact).keys.push({ id: '12345', source: 'example.com' });
    });

    const task = createObject(TestSchema.Task, {
      title: 'Fix the tests',
      assignee: Ref.make(contact),
    });

    const contactJson = objectToJSON(contact);
    const taskJson = objectToJSON(task);

    expect(contactJson.id).toBe(contact.id);
    expect(contactJson[ATTR_TYPE]).toEqual(getSchemaURI(TestSchema.Person)!.toString());
    expect(contactJson.name).toEqual('Alice');

    expect(taskJson.id).toBe(task.id);
    expect(taskJson[ATTR_TYPE]).toEqual(getSchemaURI(TestSchema.Task)!.toString());
    expect(taskJson.title).toEqual('Fix the tests');
    expect(taskJson.assignee).toEqual({ '/': EchoURI.make({ objectId: contact.id }) });

    const refResolver = new StaticRefResolver()
      .addSchema(TestSchema.Person)
      .addSchema(TestSchema.Task)
      .addObject(contact)
      .addObject(task);

    const contactFromJson = (await objectFromJSON(contactJson, { refResolver })) as TestSchema.Person;
    const taskFromJson = (await objectFromJSON(taskJson, { refResolver })) as TestSchema.Task;

    expect(contactFromJson.id).toBe(contact.id);
    expect(contactFromJson.name).toBe('Alice');
    expect((contactFromJson as any)[TypeId]).toEqual(getSchemaURI(TestSchema.Person));
    expect((contactFromJson as any)[KindId]).toBe(EntityKind.Object);
    expect((contactFromJson as any)[RelationSourceId]).toBeUndefined();
    expect((contactFromJson as any)[RelationTargetId]).toBeUndefined();
    expect((contactFromJson as any)[MetaId]).toEqual({
      keys: [
        {
          id: '12345',
          source: 'example.com',
        },
      ],
    });
    expect(getTypeURI(contactFromJson)?.toString()).toBe(getSchemaURI(TestSchema.Person)!.toString());
    expect(getTypename(contactFromJson)).toBe(getSchemaTypename(TestSchema.Person));
    expect(getObjectEchoUri(contactFromJson)?.toString()).toEqual(getObjectEchoUri(contact)?.toString());
    expect(getSchema(contactFromJson)).toEqual(TestSchema.Person);

    expect(taskFromJson.id).toBe(task.id);
    expect(taskFromJson.title).toBe('Fix the tests');
    expect(taskFromJson.assignee!.uri).toEqual(EchoURI.make({ objectId: contact.id }));
    expect(taskFromJson.assignee!.target).toEqual(contact);
    expect(await taskFromJson.assignee!.load()).toEqual(contact);
    expect((taskFromJson as any)[TypeId]).toEqual(getSchemaURI(TestSchema.Task));
    expect((taskFromJson as any)[KindId]).toBe(EntityKind.Object);
    expect((taskFromJson as any)[RelationSourceId]).toBeUndefined();
    expect((taskFromJson as any)[RelationTargetId]).toBeUndefined();
    expect((taskFromJson as any)[MetaId]).toEqual({ keys: [] });
    expect(getSchema(taskFromJson)).toEqual(TestSchema.Task);
  });

  test('serialize with unresolved schema', async () => {
    const contact = createObject(TestSchema.Person, { name: 'Alice' });
    const contactJson = objectToJSON(contact);
    const contactFromJson: any = await objectFromJSON(contactJson);

    expect(contactFromJson.id).toBe(contact.id);
    expect(contactFromJson.name).toBe('Alice');
    expect(getSchema(contactFromJson)).toBeUndefined();
    expect(getTypename(contactFromJson)).toEqual(getSchemaTypename(TestSchema.Person));
    expect(getObjectEchoUri(contactFromJson)).toEqual(getObjectEchoUri(contact));
    expect(getTypeURI(contactFromJson)).toEqual(getSchemaURI(TestSchema.Person));
  });

  test('deserializes expando without leaking internal json keys', async () => {
    const expando = Obj.make(TestSchema.Expando, { message: 'local-only' });
    const expandoJson = objectToJSON(expando);

    const refResolver = new StaticRefResolver().addSchema(TestSchema.Expando);
    const expandoFromJson = (await objectFromJSON(expandoJson, { refResolver })) as TestSchema.Expando;

    expect(expandoFromJson.id).toBe(expando.id);
    expect(expandoFromJson.message).toBe('local-only');
    expect((expandoFromJson as any)[ATTR_TYPE]).toBeUndefined();
  });

  test('deserializes expando without schema resolver and without leaking internal json keys', async () => {
    const expando = Obj.make(TestSchema.Expando, { message: 'local-only' });
    const expandoJson = objectToJSON(expando);

    const expandoFromJson = (await objectFromJSON(expandoJson)) as TestSchema.Expando;

    expect(expandoFromJson.id).toBe(expando.id);
    expect(expandoFromJson.message).toBe('local-only');
    expect((expandoFromJson as any)[ATTR_TYPE]).toBeUndefined();
  });

  describe('Uint8Array', () => {
    const Blob = Schema.Struct({
      name: Schema.String,
      bytes: Schema.Uint8ArrayFromSelf,
    }).pipe(Type.object(DXN.make('com.example.type.blob', '0.1.0')));
    interface Blob extends Schema.Schema.Type<typeof Blob> {}

    test('round-trips Uint8Array field through JSON with schema', async ({ expect }) => {
      const bytes = new Uint8Array([0, 1, 2, 3, 250, 251, 252, 253, 254, 255]);
      const blob = Obj.make(Blob, { name: 'blob', bytes });

      const blobJson = objectToJSON(blob);
      // JSON must round-trip through stringify/parse without loss.
      const roundTripped = JSON.parse(JSON.stringify(blobJson));

      const refResolver = new StaticRefResolver().addSchema(Blob);
      const blobFromJson = (await objectFromJSON(roundTripped, { refResolver })) as Blob;

      expect(blobFromJson.name).toBe('blob');
      expect(blobFromJson.bytes).toBeInstanceOf(Uint8Array);
      expect(Array.from(blobFromJson.bytes)).toEqual(Array.from(bytes));
    });

    test('round-trips Uint8Array field through JSON without schema resolver', async ({ expect }) => {
      const bytes = new Uint8Array([10, 20, 30, 40, 50]);
      const blob = Obj.make(Blob, { name: 'blob', bytes });

      const blobJson = objectToJSON(blob);
      const roundTripped = JSON.parse(JSON.stringify(blobJson));

      const blobFromJson = (await objectFromJSON(roundTripped)) as Blob;

      expect(blobFromJson.name).toBe('blob');
      expect(blobFromJson.bytes).toBeInstanceOf(Uint8Array);
      expect(Array.from(blobFromJson.bytes)).toEqual(Array.from(bytes));
    });
  });
});
