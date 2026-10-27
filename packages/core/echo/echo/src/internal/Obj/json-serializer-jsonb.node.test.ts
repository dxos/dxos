//
// Copyright 2026 DXOS.org
//

import { DatabaseSync } from 'node:sqlite';
import { describe, expect, test } from 'vitest';

import { EID, EntityId } from '@dxos/keys';
import { encodeUint8ArrayToJson } from '@dxos/util';

import * as Obj from '../../Obj.ts';
import * as Tag from '../../Tag.ts';
import { TestSchema } from '../../testing/index.ts';
import { getMetaChecked } from '../common/api/index.ts';
import { ATTR_TYPE } from '../common/types/index.ts';
import { ATTR_META } from '../common/types/meta.ts';
import { MetaId } from '../common/types/model-symbols.ts';
import { Ref, type RefResolver, StaticRefResolver } from '../Ref/index.ts';
import { createObject } from './create-object.ts';
import { objectFromJSON, objectFromJSONB, objectToJSON } from './json-serializer.ts';

const db = new DatabaseSync(':memory:');

/** SQLite's JSONB for a value, as the index stores it. */
const jsonb = (value: unknown): Uint8Array => {
  const row = db.prepare('SELECT jsonb(?) AS value').get(JSON.stringify(value));
  const bytes = row === undefined || row === null ? undefined : Reflect.get(row, 'value');
  if (!(bytes instanceof Uint8Array)) {
    throw new Error('jsonb() did not return a blob');
  }
  return bytes;
};

/** Decodes `json` both ways and checks the two objects agree on data, references, bytes and meta. */
const expectSameObject = async (json: Record<string, unknown>, options: { refResolver?: RefResolver } = {}) => {
  const fromText = await objectFromJSON(JSON.parse(JSON.stringify(json)), options);
  const fromBinary = await objectFromJSONB(jsonb(json), options);
  expect(objectToJSON(fromBinary)).toEqual(objectToJSON(fromText));
  expect(Reflect.get(fromBinary, MetaId)).toEqual(Reflect.get(fromText, MetaId));
  return { fromText, fromBinary };
};

describe('objectFromJSONB', () => {
  test('matches objectFromJSON with a schema', async () => {
    const contact = Obj.make(TestSchema.Person, { name: 'Ålice 設計 🚀' });
    Obj.update(contact, (contact) => {
      getMetaChecked(contact).keys.push({ id: '12345', source: 'example.com' });
    });
    const task = createObject(TestSchema.Task, { title: 'Fix the tests', assignee: Ref.make(contact) });
    const refResolver = new StaticRefResolver()
      .addSchema(TestSchema.Person)
      .addSchema(TestSchema.Task)
      .addObject(contact)
      .addObject(task);

    await expectSameObject(objectToJSON(contact), { refResolver });
    const { fromBinary } = await expectSameObject(objectToJSON(task), { refResolver });
    const assignee = Reflect.get(fromBinary, 'assignee');
    expect(Ref.isRef(assignee)).toBe(true);
    expect(await assignee.load()).toBe(contact);
  });

  test('matches objectFromJSON without a schema, restoring references and bytes in the one pass', async () => {
    const target = EntityId.random();
    const json = {
      id: EntityId.random(),
      [ATTR_TYPE]: 'dxn:type:com.example.type.unknown:0.1.0',
      [ATTR_META]: { keys: [{ source: 'example.com', id: 'k1' }], tags: [{ '/': EID.make({ entityId: target }) }] },
      nested: { ref: { '/': EID.make({ entityId: target }) }, list: [{ '/': EID.make({ entityId: target }) }, 1] },
      payload: encodeUint8ArrayToJson(new Uint8Array([0, 1, 2, 255])),
      text: 'ремонт',
    };

    const { fromBinary } = await expectSameObject(json);
    const nested = Reflect.get(fromBinary, 'nested');
    expect(Ref.isRef(nested.ref)).toBe(true);
    expect(Ref.isRef(nested.list[0])).toBe(true);
    expect(Reflect.get(fromBinary, 'payload')).toEqual(new Uint8Array([0, 1, 2, 255]));
  });

  test("resolves the meta's tag references to tags, not to refs, without a schema", async () => {
    const urgent = Tag.make({ label: 'urgent' });
    const expando = Obj.make(TestSchema.Expando, { tagged: Ref.make(urgent) });
    Obj.update(expando, (expando) => Obj.addTag(expando, urgent));
    const refResolver = new StaticRefResolver().addObject(urgent);

    const { fromBinary } = await expectSameObject(objectToJSON(expando), { refResolver });
    expect(Reflect.get(fromBinary, MetaId).tags).toEqual([urgent]);
    expect(Ref.isRef(Reflect.get(fromBinary, 'tagged'))).toBe(true);
  });

  test('restores bytes but leaves references to the schema when there is one', async () => {
    const contact = Obj.make(TestSchema.Person, { name: 'Bob' });
    const refResolver = new StaticRefResolver().addSchema(TestSchema.Person).addObject(contact);
    await expectSameObject(
      { ...objectToJSON(contact), avatar: encodeUint8ArrayToJson(new Uint8Array([7])) },
      { refResolver },
    );
  });

  test('rejects JSONB without a type', async () => {
    await expect(objectFromJSONB(jsonb({ id: EntityId.random() }))).rejects.toThrow();
  });
});
