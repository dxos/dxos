import { describe, expect, test } from 'vitest';

import { objectFromJSON, objectToJSON } from './json-serializer';
import { create } from './create';
import { Testing } from '../testing';
import { Ref, StaticRefResolver } from '../ref';
import { ATTR_TYPE, EntityKindId, MetaId, RelationSourceId, RelationTargetId, TypeId } from './model';
import { EntityKind, getEntityKind, getSchemaDXN, getSchemaTypename, ReferenceAnnotationId } from '../ast';
import { DXN } from '@dxos/keys';
import { getType, getTypename } from './typename';
import { getObjectDXN, getSchema } from './accessors';
import { getMeta } from './meta';

describe('Object JSON serializer', () => {
  test('should serialize and deserialize object', async () => {
    const contact = create(Testing.Contact, {
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
    expect(contactJson[ATTR_TYPE]).toEqual(getSchemaDXN(Testing.Contact)!.toString());
    expect(contactJson.name).toEqual('John Doe');

    expect(taskJson.id).toBe(task.id);
    expect(taskJson[ATTR_TYPE]).toEqual(getSchemaDXN(Testing.Task)!.toString());
    expect(taskJson.title).toEqual('Polish my shoes');
    expect(taskJson.assignee).toEqual({ '/': DXN.fromLocalObjectId(contact.id).toString() });

    const refResolver = new StaticRefResolver()
      .addSchema(Testing.Contact)
      .addSchema(Testing.Task)
      .addObject(contact)
      .addObject(task);

    const contactFromJson = (await objectFromJSON(contactJson, { refResolver })) as Testing.Contact;
    const taskFromJson = (await objectFromJSON(taskJson, { refResolver })) as Testing.Task;

    expect(contactFromJson.id).toBe(contact.id);
    expect(contactFromJson.name).toBe('John Doe');
    expect((contactFromJson as any)[TypeId]).toEqual(getSchemaDXN(Testing.Contact));
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
    expect(getType(contactFromJson)?.toString()).toBe(getSchemaDXN(Testing.Contact)!.toString());
    expect(getTypename(contactFromJson)).toBe(getSchemaTypename(Testing.Contact));
    expect(getObjectDXN(contactFromJson)?.toString()).toEqual(getObjectDXN(contact)?.toString());
    expect(getSchema(contactFromJson)).toEqual(Testing.Contact);

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
});
