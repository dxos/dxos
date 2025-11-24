//
// Copyright 2025 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { DXN } from '@dxos/keys';

import { makeObject } from '..';
import { TestSchema } from '../../testing';
import { getSchemaDXN, getSchemaTypename } from '../annotations';
import { RelationSourceId, RelationTargetId, getObjectDXN } from '../entities';
import { Ref, StaticRefResolver } from '../ref';
import {
  ATTR_TYPE,
  EntityKind,
  EntityKindId,
  MetaId,
  TypeId,
  getMeta,
  getSchema,
  getTypeDXN,
  getTypename,
} from '../types';

import { createObject } from './create-object';
import { objectFromJSON, objectToJSON } from './json-serializer';

describe('Object JSON serializer', () => {
  test('should serialize and deserialize object', async () => {
    const contact = makeObject(TestSchema.Person, { name: 'Alice' });
    getMeta(contact).keys.push({ id: '12345', source: 'example.com' });

    const task = createObject(TestSchema.Task, {
      title: 'Fix the tests',
      assignee: Ref.make(contact),
    });

    const contactJson = objectToJSON(contact);
    const taskJson = objectToJSON(task);

    expect(contactJson.id).toBe(contact.id);
    expect(contactJson[ATTR_TYPE]).toEqual(getSchemaDXN(TestSchema.Person)!.toString());
    expect(contactJson.name).toEqual('Alice');

    expect(taskJson.id).toBe(task.id);
    expect(taskJson[ATTR_TYPE]).toEqual(getSchemaDXN(TestSchema.Task)!.toString());
    expect(taskJson.title).toEqual('Fix the tests');
    expect(taskJson.assignee).toEqual({ '/': DXN.fromLocalObjectId(contact.id).toString() });

    const refResolver = new StaticRefResolver()
      .addSchema(TestSchema.Person)
      .addSchema(TestSchema.Task)
      .addObject(contact)
      .addObject(task);

    const contactFromJson = (await objectFromJSON(contactJson, { refResolver })) as TestSchema.Person;
    const taskFromJson = (await objectFromJSON(taskJson, { refResolver })) as TestSchema.Task;

    expect(contactFromJson.id).toBe(contact.id);
    expect(contactFromJson.name).toBe('Alice');
    expect((contactFromJson as any)[TypeId]).toEqual(getSchemaDXN(TestSchema.Person));
    expect((contactFromJson as any)[EntityKindId]).toBe(EntityKind.Object);
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
    expect(getTypeDXN(contactFromJson)?.toString()).toBe(getSchemaDXN(TestSchema.Person)!.toString());
    expect(getTypename(contactFromJson)).toBe(getSchemaTypename(TestSchema.Person));
    expect(getObjectDXN(contactFromJson)?.toString()).toEqual(getObjectDXN(contact)?.toString());
    expect(getSchema(contactFromJson)).toEqual(TestSchema.Person);

    expect(taskFromJson.id).toBe(task.id);
    expect(taskFromJson.title).toBe('Fix the tests');
    expect(taskFromJson.assignee!.dxn).toEqual(DXN.fromLocalObjectId(contact.id));
    expect(taskFromJson.assignee!.target).toEqual(contact);
    expect(await taskFromJson.assignee!.load()).toEqual(contact);
    expect((taskFromJson as any)[TypeId]).toEqual(getSchemaDXN(TestSchema.Task));
    expect((taskFromJson as any)[EntityKindId]).toBe(EntityKind.Object);
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
    expect(getObjectDXN(contactFromJson)).toEqual(getObjectDXN(contact));
    expect(getTypeDXN(contactFromJson)).toEqual(getSchemaDXN(TestSchema.Person));
  });
});
