import { describe, test, expect } from 'vitest';
import * as Schema from 'effect/Schema';
import * as Obj from './Obj';
import * as Type from './Type';
import { ParentId } from './internal';
import { ObjectDatabaseId } from './internal'; // Or ./Ref
import { Ref } from './internal';

const Child = Schema.Struct({ name: Schema.String }).pipe(Type.Obj({ typename: 'Child', version: '0.1.0' }));
const Parent = Schema.Struct({ name: Schema.String }).pipe(Type.Obj({ typename: 'Parent', version: '0.1.0' }));

describe('Hierarchy', () => {
  test('setParent and getParent', async () => {
    const parent = Obj.make(Parent, { name: 'parent' });
    const child = Obj.make(Child, { name: 'child' });

    // Mock Database
    const objects: Record<string, any> = { [child.id]: child, [parent.id]: parent };
    const db = { getObjectById: (id: string) => objects[id] };

    // Attach DB
    (child as any)[ObjectDatabaseId] = db;
    (parent as any)[ObjectDatabaseId] = db;

    expect(Obj.getParent(child)).toBeUndefined();

    Obj.setParent(child, parent);

    // Verify symbol is set
    const ref = (child as any)[ParentId];
    expect(ref).toBeDefined();
    expect(ref.objectId).toEqual(parent.id);

    // Verify getParent resolves via DB
    const retrievedParent = Obj.getParent(child);
    expect(retrievedParent).toBe(parent);

    Obj.setParent(child, undefined);
    expect((child as any)[ParentId]).toBeUndefined();
    expect(Obj.getParent(child)).toBeUndefined();
  });
});
