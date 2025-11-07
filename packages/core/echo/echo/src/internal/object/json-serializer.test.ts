//
// Copyright 2025 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { DXN } from '@dxos/keys';

import { EntityKind, getSchemaDXN, getSchemaTypename } from '../ast';
import { Ref, StaticRefResolver } from '../ref';
import { Testing } from '../testing';

import { getObjectDXN, getSchema } from './accessors';
import { create } from './create';
import { objectFromJSON, objectToJSON } from './json-serializer';
import { getMeta } from './meta';
import { ATTR_TYPE, EntityKindId, MetaId, RelationSourceId, RelationTargetId, TypeId } from './model';
import { getType, getTypename } from './typename';

describe('Object JSON serializer', () => {
  test('should serialize and deserialize object', async () => {
    const contact = create(Testing.Person, {
      name: 'John Doe',
    });
    getMeta(contact).keys.push({ id: '12345', source: 'crm.example.com' });

    const task = create(Testing.Task, {
      title: 'Polish my shoes',
      assignee: Ref.make(contact),
    });

    const contactJson = objectToJSON(contact);
    const taskJson = objectToJSON(task);

    expect(contactJson.id).toBe(contact.id);
    expect(contactJson[ATTR_TYPE]).toEqual(getSchemaDXN(Testing.Person)!.toString());
    expect(contactJson.name).toEqual('John Doe');

    expect(taskJson.id).toBe(task.id);
    expect(taskJson[ATTR_TYPE]).toEqual(getSchemaDXN(Testing.Task)!.toString());
    expect(taskJson.title).toEqual('Polish my shoes');
    expect(taskJson.assignee).toEqual({ '/': DXN.fromLocalObjectId(contact.id).toString() });

    const refResolver = new StaticRefResolver()
      .addSchema(Testing.Person)
      .addSchema(Testing.Task)
      .addObject(contact)
      .addObject(task);

    const contactFromJson = (await objectFromJSON(contactJson, { refResolver })) as Testing.Person;
    const taskFromJson = (await objectFromJSON(taskJson, { refResolver })) as Testing.Task;

    expect(contactFromJson.id).toBe(contact.id);
    expect(contactFromJson.name).toBe('John Doe');
    expect((contactFromJson as any)[TypeId]).toEqual(getSchemaDXN(Testing.Person));
    expect((contactFromJson as any)[EntityKindId]).toBe(EntityKind.Object);
    expect((contactFromJson as any)[RelationSourceId]).toBeUndefined();
    expect((contactFromJson as any)[RelationTargetId]).toBeUndefined();
    expect((contactFromJson as any)[MetaId]).toEqual({
      keys: [
        {
          id: '12345',
          source: 'crm.example.com',
        },
      ],
    });
    expect(getType(contactFromJson)?.toString()).toBe(getSchemaDXN(Testing.Person)!.toString());
    expect(getTypename(contactFromJson)).toBe(getSchemaTypename(Testing.Person));
    expect(getObjectDXN(contactFromJson)?.toString()).toEqual(getObjectDXN(contact)?.toString());
    expect(getSchema(contactFromJson)).toEqual(Testing.Person);

    expect(taskFromJson.id).toBe(task.id);
    expect(taskFromJson.title).toBe('Polish my shoes');
    expect(taskFromJson.assignee!.dxn).toEqual(DXN.fromLocalObjectId(contact.id));
    expect(taskFromJson.assignee!.target).toEqual(contact);
    expect(await taskFromJson.assignee!.load()).toEqual(contact);
    expect((taskFromJson as any)[TypeId]).toEqual(getSchemaDXN(Testing.Task));
    expect((taskFromJson as any)[EntityKindId]).toBe(EntityKind.Object);
    expect((taskFromJson as any)[RelationSourceId]).toBeUndefined();
    expect((taskFromJson as any)[RelationTargetId]).toBeUndefined();
    expect((taskFromJson as any)[MetaId]).toEqual({ keys: [] });
    expect(getSchema(taskFromJson)).toEqual(Testing.Task);
  });

  test('serialize with unresolved schema', async () => {
    const contact = create(Testing.Person, {
      name: 'John Doe',
    });
    const contactJson = objectToJSON(contact);
    const contactFromJson: any = await objectFromJSON(contactJson);

    expect(contactFromJson.id).toBe(contact.id);
    expect(contactFromJson.name).toBe('John Doe');
    expect(getSchema(contactFromJson)).toBeUndefined();
    expect(getTypename(contactFromJson)).toEqual(getSchemaTypename(Testing.Person));
    expect(getObjectDXN(contactFromJson)).toEqual(getObjectDXN(contact));
    expect(getType(contactFromJson)).toEqual(getSchemaDXN(Testing.Person));
  });
});
