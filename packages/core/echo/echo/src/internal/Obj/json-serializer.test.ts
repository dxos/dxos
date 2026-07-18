//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, expect, test } from 'vitest';

import { DXN, EID } from '@dxos/keys';

import * as Obj from '../../Obj';
import * as Relation from '../../Relation';
import { TestSchema } from '../../testing';
import * as Type from '../../Type';
import { getTypename, getTypeURI } from '../Annotation';
import { getMetaChecked } from '../common/api';
import { makeDecodedEntityLive } from '../common/proxy';
import { type AnyEntity, ATTR_TYPE, EntityKind, KindId, TypeId, getSchema } from '../common/types';
import { MetaId } from '../common/types/model-symbols';
import { RelationSourceId, RelationTargetId, getObjectEchoUri } from '../Entity';
import * as JsonSchema from '../JsonSchema';
import { Ref, type RefResolver, StaticRefResolver } from '../Ref';
import { createObject } from './create-object';
import { objectFromJSON, objectToJSON } from './json-serializer';

/**
 * Decode JSON and rewrap as a live reactive proxy — mirrors the feed hydration path
 * (`objectFromJSON` then {@link makeDecodedEntityLive}).
 */
const decodeLive = async (json: unknown, options?: { refResolver?: RefResolver }): Promise<AnyEntity> =>
  makeDecodedEntityLive(await objectFromJSON(json, options));

describe('Object JSON serializer', () => {
  test('should serialize and deserialize object', async () => {
    const contact = Obj.make(TestSchema.Person, { name: 'Alice' });
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
    expect(contactJson[ATTR_TYPE]).toEqual(Type.getURI(TestSchema.Person).toString());
    expect(contactJson.name).toEqual('Alice');

    expect(taskJson.id).toBe(task.id);
    expect(taskJson[ATTR_TYPE]).toEqual(Type.getURI(TestSchema.Task).toString());
    expect(taskJson.title).toEqual('Fix the tests');
    expect(taskJson.assignee).toEqual({ '/': EID.make({ entityId: contact.id }) });

    const refResolver = new StaticRefResolver()
      .addSchema(TestSchema.Person)
      .addSchema(TestSchema.Task)
      .addObject(contact)
      .addObject(task);

    const contactFromJson = (await objectFromJSON(contactJson, { refResolver })) as TestSchema.Person;
    const taskFromJson = (await objectFromJSON(taskJson, { refResolver })) as TestSchema.Task;

    expect(contactFromJson.id).toBe(contact.id);
    expect(contactFromJson.name).toBe('Alice');
    expect((contactFromJson as any)[TypeId]).toEqual(Type.getURI(TestSchema.Person));
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
      tags: [],
      annotations: {},
    });
    expect(getTypeURI(contactFromJson)?.toString()).toBe(Type.getURI(TestSchema.Person).toString());
    expect(getTypename(contactFromJson)).toBe(Type.getTypename(TestSchema.Person));
    expect(getObjectEchoUri(contactFromJson)?.toString()).toEqual(getObjectEchoUri(contact)?.toString());
    expect(getSchema(contactFromJson)).toEqual(Type.getSchema(TestSchema.Person));

    expect(taskFromJson.id).toBe(task.id);
    expect(taskFromJson.title).toBe('Fix the tests');
    expect(taskFromJson.assignee!.uri).toEqual(EID.make({ entityId: contact.id }));
    expect(taskFromJson.assignee!.target).toEqual(contact);
    expect(await taskFromJson.assignee!.load()).toEqual(contact);
    expect((taskFromJson as any)[TypeId]).toEqual(Type.getURI(TestSchema.Task));
    expect((taskFromJson as any)[KindId]).toBe(EntityKind.Object);
    expect((taskFromJson as any)[RelationSourceId]).toBeUndefined();
    expect((taskFromJson as any)[RelationTargetId]).toBeUndefined();
    expect((taskFromJson as any)[MetaId]).toEqual({ keys: [], tags: [], annotations: {} });
    expect(getSchema(taskFromJson)).toEqual(Type.getSchema(TestSchema.Task));
  });

  test('serialize with unresolved schema', async () => {
    const contact = createObject(TestSchema.Person, { name: 'Alice' });
    const contactJson = objectToJSON(contact);
    const contactFromJson: any = await objectFromJSON(contactJson);

    expect(contactFromJson.id).toBe(contact.id);
    expect(contactFromJson.name).toBe('Alice');
    expect(getSchema(contactFromJson)).toBeUndefined();
    expect(getTypename(contactFromJson)).toEqual(Type.getTypename(TestSchema.Person));
    expect(getObjectEchoUri(contactFromJson)).toEqual(getObjectEchoUri(contact));
    expect(getTypeURI(contactFromJson)).toEqual(Type.getURI(TestSchema.Person));
  });

  test('upgrades bare string tags to encoded references on deserialize', async () => {
    const expando = Obj.make(TestSchema.Expando, { message: 'hi' });
    const json = objectToJSON(expando) as any;
    // Simulate data serialized before the tags-as-refs migration: bare id strings.
    json['@meta'] = { keys: [], tags: ['echo:/TAGLEGACY'] };

    const fromJson = (await objectFromJSON(json)) as any;
    // Decodes to a materialized `Ref` (the shared ref codec), not a raw encoded reference.
    expect(fromJson[MetaId].tags.map((ref: any) => ref.uri)).toEqual(['echo:/TAGLEGACY']);
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

  // `objectFromJSON` is the deserialization path for queue messages and devtools
  // round-trips. For persisted `Type.Type` entities it must stamp `KindId = Type`
  // (not Object), mirroring the kind resolution that `createObject` does for the
  // in-memory path. Otherwise `Filter.type(Type.Type)` / `Type.isType` skip them.
  describe('Type.Type round-trip', () => {
    test('preserves KindId=Type for a persisted Type.Type entity', async ({ expect }) => {
      const typeEntity = Type.makeObjectFromJsonSchema({
        typename: 'com.example.type.regression',
        version: '0.1.0',
        jsonSchema: JsonSchema.toJsonSchema(Schema.Struct({ field: Schema.Number })),
        name: 'Regression Type',
      });

      const typeJson = objectToJSON(typeEntity as any);
      const refResolver = new StaticRefResolver().addSchema(Type.Type);
      const reconstructed = (await objectFromJSON(typeJson, { refResolver })) as any;

      expect(reconstructed[KindId]).toBe(EntityKind.Type);
      expect(Type.isType(reconstructed)).toBe(true);
      // `typename` lives in `EntityMeta.key` on persisted Type.Type entities
      // — surfaced via `Type.getTypename`.
      expect(Type.getTypename(reconstructed)).toBe('com.example.type.regression');
    });
  });

  describe('live decode', () => {
    test('decodes as a live proxy, not a plain snapshot', async () => {
      const contact = Obj.make(TestSchema.Person, { name: 'Alice' });
      const contactJson = objectToJSON(contact);
      const refResolver = new StaticRefResolver().addSchema(TestSchema.Person);

      const live = (await decodeLive(contactJson, { refResolver })) as TestSchema.Person;

      expect(Obj.instanceOf(TestSchema.Person)(live)).toBe(true);
      expect(live.name).toBe('Alice');
    });

    test('Obj.update mutates synchronously and notifies subscribers', async () => {
      const contact = Obj.make(TestSchema.Person, { name: 'Alice' });
      const contactJson = objectToJSON(contact);
      const refResolver = new StaticRefResolver().addSchema(TestSchema.Person);
      const live = (await decodeLive(contactJson, { refResolver })) as TestSchema.Person;

      let notified = 0;
      const unsubscribe = Obj.subscribe(live, () => {
        notified++;
      });

      Obj.update(live, (live) => {
        live.name = 'Bob';
      });

      expect(live.name).toBe('Bob');
      expect(notified).toBe(1);
      unsubscribe();
    });

    test('direct assignment outside Obj.update throws', async () => {
      const contact = Obj.make(TestSchema.Person, { name: 'Alice' });
      const contactJson = objectToJSON(contact);
      const refResolver = new StaticRefResolver().addSchema(TestSchema.Person);
      const live = (await decodeLive(contactJson, { refResolver })) as TestSchema.Person;

      expect(() => {
        (live as any).name = 'Bob';
      }).toThrow();
    });

    test('Obj.getSnapshot returns a non-live snapshot unaffected by later updates', async () => {
      const contact = Obj.make(TestSchema.Person, { name: 'Alice' });
      const contactJson = objectToJSON(contact);
      const refResolver = new StaticRefResolver().addSchema(TestSchema.Person);
      const live = (await decodeLive(contactJson, { refResolver })) as TestSchema.Person;

      const snapshot = Obj.getSnapshot(live);
      Obj.update(live, (live) => {
        live.name = 'Bob';
      });

      expect(snapshot.name).toBe('Alice');
      expect(live.name).toBe('Bob');
    });

    test('meta is mutable within a change context', async () => {
      const contact = Obj.make(TestSchema.Person, { name: 'Alice' });
      const contactJson = objectToJSON(contact);
      const refResolver = new StaticRefResolver().addSchema(TestSchema.Person);
      const live = (await decodeLive(contactJson, { refResolver })) as TestSchema.Person;

      Obj.update(live, (live) => {
        Obj.getMeta(live).keys.push({ id: 'abc', source: 'example.com' });
      });

      expect(Obj.getMeta(live).keys).toEqual([{ id: 'abc', source: 'example.com' }]);
    });

    test('live decode of a relation', async () => {
      const alice = Obj.make(TestSchema.Person, { name: 'Alice' });
      const org = Obj.make(TestSchema.Organization, { name: 'Acme' });
      const relation = Relation.make(TestSchema.EmployedBy, {
        [Relation.Source]: alice,
        [Relation.Target]: org,
        role: 'Engineer',
      });
      const relationJson = objectToJSON(relation as any);
      const refResolver = new StaticRefResolver()
        .addSchema(TestSchema.EmployedBy)
        .addSchema(TestSchema.Person)
        .addSchema(TestSchema.Organization)
        .addObject(alice)
        .addObject(org);

      const live = (await decodeLive(relationJson, { refResolver })) as any;

      let notified = 0;
      const unsubscribe = Obj.subscribe(live, () => {
        notified++;
      });
      Relation.update(live, (live) => {
        live.role = 'Senior Engineer';
      });
      expect(live.role).toBe('Senior Engineer');
      expect(notified).toBe(1);
      unsubscribe();
    });

    test('schemaless (unresolvable type) items stay plain, non-proxy snapshots', async () => {
      const contact = createObject(TestSchema.Person, { name: 'Alice' });
      const contactJson = objectToJSON(contact);

      const live: any = await decodeLive(contactJson);

      expect(getSchema(live)).toBeUndefined();
      expect(live.name).toBe('Alice');
      // No schema means `Obj.update` cannot validate mutations — direct assignment remains a
      // silent no-op-safe plain-object write, not a throw.
      live.name = 'Bob';
      expect(live.name).toBe('Bob');
    });

    test('a malformed decoded shape surfaces a clear error rather than a silent bad proxy', async () => {
      const contact = Obj.make(TestSchema.Person, { name: 'Alice' });
      const contactJson: any = objectToJSON(contact);
      // Corrupt a field so it violates the schema; live decode must not swallow this.
      contactJson.age = 'not-a-number';
      const refResolver = new StaticRefResolver().addSchema(TestSchema.Person);

      await expect(decodeLive(contactJson, { refResolver })).rejects.toThrow();
    });

    test('nested array fields become reactive on live decode', async () => {
      const task1 = Obj.make(TestSchema.Task, { title: 'Task 1' });
      const contact = Obj.make(TestSchema.Person, { name: 'Alice', tasks: [Ref.make(task1)] });
      const contactJson = objectToJSON(contact);
      const refResolver = new StaticRefResolver()
        .addSchema(TestSchema.Person)
        .addSchema(TestSchema.Task)
        .addObject(task1);

      const live = (await decodeLive(contactJson, { refResolver })) as TestSchema.Person;

      let notified = 0;
      const unsubscribe = Obj.subscribe(live, () => {
        notified++;
      });
      const task2 = Obj.make(TestSchema.Task, { title: 'Task 2' });
      Obj.update(live, (live) => {
        live.tasks!.push(Ref.make(task2));
      });

      expect(live.tasks).toHaveLength(2);
      expect(notified).toBe(1);
      unsubscribe();
    });
  });

  describe('Uint8Array', () => {
    const Blob = Type.makeObject(DXN.make('com.example.type.blob', '0.1.0'))(
      Schema.Struct({
        name: Schema.String,
        bytes: Schema.Uint8ArrayFromSelf,
      }),
    );
    type Blob = Type.InstanceType<typeof Blob>;

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
