//
// Copyright 2024 DXOS.org
//

import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import { inspect } from 'node:util';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { Context } from '@dxos/context';
import { Annotation, DXN, Entity, Filter, Obj, Query, Ref, Relation, Type } from '@dxos/echo';
import { EncodedReference } from '@dxos/echo-protocol';
import {
  ATTR_RELATION_SOURCE,
  ATTR_RELATION_TARGET,
  EchoObjectSchema,
  type RefSchema,
  foreignKey,
} from '@dxos/echo/internal';
import { TestSchema, prepareAstForCompare } from '@dxos/echo/testing';
import { EID, EntityId, PublicKey, SpaceId, URI } from '@dxos/keys';
import { log } from '@dxos/log';
import { openAndClose } from '@dxos/test-utils';

import { Doc } from '../automerge';
import { EchoTestBuilder, createTmpPath } from '../testing';
import { createObject, getObjectCore } from './echo-handler';
import { isEchoObject } from './echo-object-utils';

const TEST_OBJECT: TestSchema.ExampleSchema = {
  string: 'foo',
  number: 42,
  boolean: true,
  null: null,
  stringArray: ['1', '2', '3'],
  nested: {
    field: 'bar',
  },
};

test('id property name is reserved', () => {
  const invalidSchema = Schema.Struct({ id: Schema.Number });
  // @ts-expect-error - Testing invalid schema (missing typename/version).
  expect(() => createObject(Obj.make(invalidSchema, { id: 42 } as any))).to.throw();
});

describe('ECHO specific proxy properties with schema', () => {
  test('has id', () => {
    const obj = createObject(Obj.make(TestSchema.Example, { string: 'bar' }));
    expect(obj.id).not.to.be.undefined;
  });

  test('inspect', () => {
    const obj = createObject(
      Obj.make(TestSchema.Example, {
        id: '01KB0G0HR8BSPH11XJS85BGSWF',
        string: 'bar',
      }),
    );
    const str = inspect(obj, { colors: false });
    expect(str).toMatchInlineSnapshot(
      `"TypedEchoObject(dxn:com.example.type.example:0.1.0) { string: 'bar', id: '01KB0G0HR8BSPH11XJS85BGSWF' }"`,
    );
  });

  test('throws when assigning a class instance inside Obj.update', () => {
    const obj = createObject(Obj.make(TestSchema.Example, {}));
    expect(() => {
      Obj.update(obj, (obj) => {
        obj.classInstance = new TestSchema.TestClass();
      });
    }).to.throw();
  });

  test('throws when creates with a class instances', () => {
    expect(() => {
      createObject(
        Obj.make(TestSchema.Example, {
          classInstance: new TestSchema.TestClass(),
        }),
      );
    }).to.throw();
  });

  test('removes undefined fields on creation', () => {
    const obj = createObject(Obj.make(TestSchema.Example, { undefined }));
    expect(obj).to.deep.eq({ id: obj.id });
  });

  test('isEchoObject', () => {
    const obj = createObject(Obj.make(TestSchema.Example, { string: 'bar' }));
    expect(isEchoObject(obj)).to.be.true;
  });

  test('subscribe', () => {
    const obj = createObject(Obj.make(TestSchema.Example, { string: 'bar' }));
    let called = 0;
    const unsubscribe = Obj.subscribe(obj, () => {
      called++;
    });

    Obj.update(obj, (obj) => {
      obj.string = 'baz';
    });
    expect(called).to.eq(1);

    unsubscribe();
    Obj.update(obj, (obj) => {
      obj.string = 'qux';
    });
    expect(called).to.eq(1);
  });
});

describe('without database', () => {
  interface TestSchema extends Obj.Unknown {
    readonly text?: string;
    readonly nested: {
      readonly name?: string;
      readonly arr?: readonly string[];
      readonly ref?: Ref.Ref<TestSchema>;
    };
  }

  const TestSchema: Type.Obj<TestSchema> = Schema.Struct({
    text: Schema.optional(Schema.String),
    nested: Schema.Struct({
      name: Schema.optional(Schema.String),
      arr: Schema.optional(Schema.Array(Schema.String)),
      ref: Schema.optional(Schema.suspend((): RefSchema<TestSchema> => Ref.Ref(TestSchema))),
    }),
  }).pipe(EchoObjectSchema(DXN.make('com.example.type.test', '0.1.0'))) as any;

  test('get schema on object', () => {
    const obj = createObject(Obj.make(TestSchema, { nested: { name: 'foo', arr: [] } }));
    const type = Obj.getType(obj);
    expect(type).to.exist;
    expect(prepareAstForCompare(Type.getSchema(type!).ast)).to.deep.eq(
      prepareAstForCompare(Type.getSchema(TestSchema).ast),
    );
  });

  // TODO(dmaretskyi): Fix -- right now we always return the root schema.
  test.skip('get schema on nested object', () => {
    const obj = createObject(Obj.make(TestSchema, { nested: { name: 'foo', arr: [] } }));
    const NestedSchema = Type.getSchema(TestSchema).pipe(Schema.pluck('nested'), Schema.typeSchema);
    expect(prepareAstForCompare(Type.getSchema(Obj.getType(obj.nested as Obj.Unknown)!).ast)).to.deep.eq(
      prepareAstForCompare(NestedSchema.ast),
    );
  });

  test('create', () => {
    const obj = createObject(Obj.make(TestSchema, { nested: { name: 'foo', arr: [] } }));
    Obj.update(obj, (obj) => {
      obj.nested.name = 'bar';
      obj.nested.arr = ['a', 'b', 'c'];
      obj.nested.arr.push('d');
    });
  });

  test('doc accessor', () => {
    const obj = createObject(Obj.make(TestSchema, { text: 'foo', nested: { name: 'bar' } }));

    {
      const accessor = getObjectCore(obj).getDocAccessor(['text']);
      expect(Doc.getValue(accessor)).toEqual('foo');
    }

    {
      const accessor = getObjectCore(obj).getDocAccessor(['nested', 'name']);
      expect(Doc.getValue(accessor)).toEqual('bar');
    }
  });
});

describe('Reactive Object with ECHO database', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('Obj.isObject', async () => {
    const { db } = await builder.createDatabase({ types: [TestSchema.Example] });
    const obj = db.add(Obj.make(TestSchema.Example, { string: 'foo' }));
    expect(Obj.isObject(obj)).to.be.true;
  });

  test('snapshots', async () => {
    const { db } = await builder.createDatabase({ types: [TestSchema.Example] });
    const obj = db.add(Obj.make(TestSchema.Example, { string: 'foo' }));
    const snapshot = Obj.getSnapshot(obj);
    expect(Obj.isObject(snapshot)).to.be.false;
    expect(Entity.isEntity(snapshot)).to.be.false;
    expect(Obj.isSnapshot(snapshot)).to.be.true;
    expect(Entity.isSnapshot(snapshot)).to.be.true;
    expect(Relation.isSnapshot(snapshot)).to.be.false;
    expect(Obj.getType(snapshot)).to.eq(TestSchema.Example);
    expect(Obj.getURI(snapshot)).to.eq(Obj.getURI(obj));
  });

  test('throws if schema was not annotated as echo object', async () => {
    const NonEchoSchema = Schema.Struct({ field: Schema.String });
    const { graph } = await builder.createDatabase();
    // addTypes throws for schemas without TypeAnnotationId annotation (no typename/version).
    expect(() => graph.registry.add([NonEchoSchema as unknown as Type.AnyEntity])).to.throw();
  });

  test('throws if schema was not registered in Hypergraph', async () => {
    const { db } = await builder.createDatabase();
    expect(() => db.add(Obj.make(TestSchema.Example, { string: 'foo' }))).to.throw();
  });

  test('existing proxy objects can be added to the database', async () => {
    const { db } = await builder.createDatabase({ types: [TestSchema.Example] });

    const obj = Obj.make(TestSchema.Example, { string: 'foo' });
    const returnObj = db.add(obj);
    expect(returnObj.id).to.be.a('string');
    expect(returnObj.string).to.eq('foo');
    expect(Obj.getType(returnObj)).to.eq(TestSchema.Example);
    expect(returnObj === obj).to.be.true;
  });

  test('existing proxy objects can be passed to create', async () => {
    const TestSchema = Type.makeObject(DXN.make('com.example.type.test', '0.1.0'))(
      Schema.Struct({
        field: Schema.Any,
      }),
    );

    const { db, graph } = await builder.createDatabase();
    graph.registry.add([TestSchema]);
    const objectHost = db.add(Obj.make(TestSchema, { field: [] }));
    const object = db.add(Obj.make(TestSchema, { field: 'foo' }));
    Obj.update(objectHost, (objectHost) => {
      objectHost.field?.push({ hosted: Ref.make(object) });
    });
    Obj.make(TestSchema, {
      field: [Obj.make(TestSchema, { field: Ref.make(objectHost) })],
    });
    expect(objectHost.field[0].hosted).not.to.be.undefined;
  });

  test('proxies are initialized when a plain object is inserted into the database', async () => {
    const { db } = await builder.createDatabase();

    const obj = db.add(Obj.make(TestSchema.Expando, { string: 'foo' }));
    expect(obj.id).to.be.a('string');
    expect(obj.string).to.eq('foo');
    // Note: Schema is now tracked for all typed objects (Expando is the default schema).
    expect(Obj.getType(obj)).to.eq(TestSchema.Expando);
  });

  test('instantiating reactive objects after a restart', async () => {
    const tmpPath = createTmpPath();
    const spaceKey = PublicKey.random();

    const builder = new EchoTestBuilder();
    await openAndClose(builder);
    const peer = await builder.createPeer({ storagePath: tmpPath });
    const root = await peer.host.createSpaceRoot(Context.default(), spaceKey);
    peer.client.graph.registry.add([TestSchema.Example]);

    let id: string;
    {
      const db = await peer.openDatabase(spaceKey, root.url);
      const obj = db.add(Obj.make(TestSchema.Example, { string: 'foo' }));
      id = obj.id;
      await db.flush();
      await peer.close();
    }

    // Create a new DB instance to simulate a restart
    {
      const peer = await builder.createPeer({ storagePath: tmpPath });
      peer.client.graph.registry.add([TestSchema.Example]);
      const db = await peer.openDatabase(spaceKey, root.url);

      const obj = (await db.query(Query.select(Filter.id(id))).first()) as TestSchema.Example;
      expect(isEchoObject(obj)).to.be.true;
      expect(obj.id).to.eq(id);
      expect(obj.string).to.eq('foo');

      expect(Obj.getType(obj)).to.eq(TestSchema.Example);
    }
  });

  test('restart with static schema and schema is registered later', async () => {
    const tmpPath = createTmpPath();
    const spaceKey = PublicKey.random();

    const builder = new EchoTestBuilder();
    await openAndClose(builder);
    const peer = await builder.createPeer({ storagePath: tmpPath });
    const root = await peer.host.createSpaceRoot(Context.default(), spaceKey);

    let id: string;
    {
      peer.client.graph.registry.add([TestSchema.Example]);
      const db = await peer.openDatabase(spaceKey, root.url);

      const obj = db.add(Obj.make(TestSchema.Example, { string: 'foo' }));
      id = obj.id;
      await db.flush();
      await peer.close();
    }

    // Create a new DB instance to simulate a restart
    {
      const peer = await builder.createPeer({ storagePath: tmpPath });
      const db = await peer.openDatabase(spaceKey, root.url);

      const obj = (await db.query(Filter.id(id)).first()) as TestSchema.Example;
      expect(isEchoObject(obj)).to.be.true;
      expect(obj.id).to.eq(id);
      expect(obj.string).to.eq('foo');

      peer.client.graph.registry.add([TestSchema.Example]);
      expect(Obj.getType(obj)).to.eq(TestSchema.Example);
    }
  });

  test('id is persisted after adding object to DB', async () => {
    const { db } = await builder.createDatabase();
    const reactiveObj = Obj.make(TestSchema.Expando, { string: 'foo' });
    const echoObj = db.add(reactiveObj);

    expect(echoObj.id).to.eq(reactiveObj.id);
  });

  describe('queries', () => {
    test('filter by schema or typename', async () => {
      const { db, graph } = await builder.createDatabase();
      graph.registry.add([TestSchema.Example]);

      db.add(Obj.make(TestSchema.Example, { string: 'foo' }));

      {
        const queryResult = await db.query(Filter.type(TestSchema.Example)).run();
        expect(queryResult.length).to.eq(1);
      }

      {
        // Also verify Filter.type accepts a canonical DXN URI string.
        const queryResult = await db.query(Filter.type(DXN.make(Type.getTypename(TestSchema.Example)))).run();
        expect(queryResult.length).to.eq(1);
      }
    });

    test('does not return deleted objects', async () => {
      const { db, graph } = await builder.createDatabase();
      graph.registry.add([TestSchema.Example]);
      const obj = db.add(Obj.make(TestSchema.Example, { string: 'foo' }));
      const query = db.query(Filter.type(TestSchema.Example));

      expect((await query.run()).length).to.eq(1);

      db.remove(obj);
      expect((await query.run()).length).to.eq(0);
    });

    test('deleted objects are returned when re-added', async () => {
      const { db, graph } = await builder.createDatabase();
      graph.registry.add([TestSchema.Example]);
      const obj = db.add(Obj.make(TestSchema.Example, { string: 'foo' }));
      db.remove(obj);
      const query = await db.query(Filter.type(TestSchema.Example));
      expect((await query.run()).length).to.eq(0);

      db.add(obj);
      expect((await query.run()).length).to.eq(1);
    });
  });

  test('calling toJSON on an object', async () => {
    const { db, graph } = await builder.createDatabase();
    graph.registry.add([TestSchema.Example]);
    const objects = [db.add(Obj.make(TestSchema.Example, TEST_OBJECT))];
    for (const obj of objects) {
      const objData: any = (obj as any).toJSON();
      expect(objData).to.deep.contain({
        ...TEST_OBJECT,
        id: obj.id,
        '@type': 'dxn:com.example.type.example:0.1.0',
        '@meta': { keys: [] },
      });
    }
  });

  test('calling Object.toJSON on an object', async () => {
    const { db, graph } = await builder.createDatabase();
    graph.registry.add([TestSchema.Example]);
    const obj = db.add(Obj.make(TestSchema.Example, TEST_OBJECT));
    const objData: any = Obj.toJSON(obj as any);
    expect(objData).to.deep.contain({ ...TEST_OBJECT, id: obj.id });
  });

  test('relation toJSON', async () => {
    const { db, graph } = await builder.createDatabase();
    graph.registry.add([TestSchema.Person, TestSchema.HasManager]);
    const alice = db.add(Obj.make(TestSchema.Person, { name: 'Alice' }));
    const bob = db.add(Obj.make(TestSchema.Person, { name: 'Bob' }));
    const manager = db.add(
      Relation.make(TestSchema.HasManager, {
        [Relation.Target]: bob,
        [Relation.Source]: alice,
      }),
    );
    const objData = Relation.toJSON(manager);
    expect(objData).to.deep.contain({
      id: manager.id,
      [ATTR_RELATION_SOURCE]: EID.make({ entityId: alice.id }),
      [ATTR_RELATION_TARGET]: EID.make({ entityId: bob.id }),
    });
  });

  test('undefined field handling', async () => {
    const { db } = await builder.createDatabase();
    const object = db.add(
      Obj.make(TestSchema.Expando, {
        field: undefined,
        nested: { deep: { field: undefined } },
        array: [{ field: undefined }],
      }),
    );
    Obj.update(object, (object) => {
      object.array.push({ field: undefined });
    });
    for (const value of [object.field, object.nested.deep.field, ...object.array.map((o: any) => o.field)]) {
      expect(value).to.be.undefined;
    }
  });

  describe('references', () => {
    const Organization = Type.makeObject(DXN.make('com.example.type.organization', '0.1.0'))(
      Schema.Struct({
        name: Schema.String,
      }),
    );

    const Contact = Type.makeObject(DXN.make('com.example.type.person', '0.1.0'))(
      Schema.Struct({
        name: Schema.String,
        organization: Ref.Ref(Organization),
        previousEmployment: Schema.optional(Schema.Array(Ref.Ref(Organization))),
      }),
    );

    test('references', async () => {
      const { db, graph } = await builder.createDatabase();
      graph.registry.add([Organization, Contact]);

      const orgName = 'DXOS';
      const org = db.add(Obj.make(Organization, { name: orgName }));
      const person = db.add(Obj.make(Contact, { name: 'John', organization: Ref.make(org) }));

      expect(person.organization.target).to.deep.eq(org);
      expect(person.organization.target?.name).to.eq(orgName);
    });

    test('serialized references', async () => {
      const { db, graph } = await builder.createDatabase();
      graph.registry.add([TestSchema.Example]);

      const obj1 = Obj.make(TestSchema.Example, {
        reference: Ref.make(Obj.make(TestSchema.Example, { string: 'test' })),
      });

      // Fully serialized before added to db.
      {
        const obj = JSON.parse(JSON.stringify(obj1));
        expect(obj.reference['/']).to.eq(EID.make({ entityId: obj1.reference!.target!.id }));
      }

      const obj2 = db.add(obj1);

      // References serialized as IPLD.
      {
        const obj = JSON.parse(JSON.stringify(obj2));
        const refUri = EncodedReference.toURI(obj.reference);
        const refEchoUri = EID.tryParse(refUri);
        expect(refEchoUri ? EID.getEntityId(refEchoUri) : undefined).to.eq(obj2.reference?.target?.id);
      }

      // Load refs.
      // TODO(burdon): This should already be loaded so test eviction?
      {
        const nested = await obj2.reference?.load();
        expect(nested?.string).to.eq('test');
      }
    });

    test('circular references', async () => {
      const { db } = await builder.createDatabase();
      const another = Obj.make(TestSchema.Expando, { title: 'another' });
      const task = Obj.make(TestSchema.Expando, { title: 'test', previous: Ref.make(another) });
      Obj.update(another, (another) => {
        another.previous = Ref.make(task);
      });
      db.add(task);
    });

    test('adding object with nested objects to DB', async () => {
      const { db, graph } = await builder.createDatabase();
      graph.registry.add([Organization, Contact]);

      const person = db.add(
        Obj.make(Contact, {
          name: 'John',
          organization: Ref.make(Obj.make(Organization, { name: 'DXOS' })),
        }),
      );

      expect(person.organization.target?.name).to.eq('DXOS');
      expect(person.organization.target?.id).to.be.a('string');
    });

    test('Obj.clone(deep) then add: top-level Ref on echo object loads (sanity)', async () => {
      const { db, graph } = await builder.createDatabase();
      graph.registry.add([Organization, Contact]);

      const original = Obj.make(Contact, {
        name: 'John',
        organization: Ref.make(Obj.make(Organization, { name: 'DXOS' })),
      });
      const cloned = Obj.clone(original, { deep: 'all' });
      const person = db.add(cloned);

      expect(cloned.organization.target?.id).not.to.eq(original.organization.target?.id);
      const nested = await person.organization.load();
      expect(nested?.name).to.eq('DXOS');
    });

    test('adding objects with nested arrays to DB', async () => {
      const { db, graph } = await builder.createDatabase();
      graph.registry.add([Organization, Contact]);

      const dxos = Obj.make(Organization, { name: 'DXOS' });
      const braneframe = Obj.make(Organization, { name: 'Braneframe' });
      const person = db.add(
        Obj.make(Contact, {
          name: 'John',
          organization: Ref.make(dxos),
          previousEmployment: [Ref.make(dxos), Ref.make(braneframe)],
        }),
      );

      expect(person.previousEmployment![0]!.target?.name).to.eq('DXOS');
      expect(person.previousEmployment![1]!.target?.name).to.eq('Braneframe');
    });

    test('adding untyped objects with nested arrays to DB', async () => {
      const { db } = await builder.createDatabase();

      const person = db.add(
        Obj.make(TestSchema.Expando, {
          name: 'John',
          previousEmployment: [
            Ref.make(Obj.make(TestSchema.Expando, { name: 'DXOS' })),
            Ref.make(Obj.make(TestSchema.Expando, { name: 'Braneframe' })),
          ],
        }),
      );

      expect(person.previousEmployment![0]!.target?.name).to.eq('DXOS');
      expect(person.previousEmployment![1]!.target?.name).to.eq('Braneframe');
    });

    test('cross reference', async () => {
      const testBuilder = new EchoTestBuilder();
      await openAndClose(testBuilder);
      const { db } = await testBuilder.createDatabase();
      db.graph.registry.add([TestSchema.Person, TestSchema.Task]);

      const contact = Obj.make(TestSchema.Person, {
        name: 'Contact',
        tasks: [],
      });
      db.add(contact);
      const task1 = Obj.make(TestSchema.Task, { title: 'Task1' });
      const task2 = Obj.make(TestSchema.Task, { title: 'Task2' });

      Obj.update(contact, (contact) => {
        contact.tasks!.push(Ref.make(task1));
        contact.tasks!.push(Ref.make(task2));
      });

      Obj.update(task2, (task2) => {
        task2.previous = Ref.make(task1);
      });

      expect(contact.tasks![0].target).to.eq(task1);
      expect(contact.tasks![1].target).to.eq(task2);
      expect(task2.previous!.target).to.eq(task1);
    });

    test('reference properties in expando objects', async () => {
      const { db, graph } = await builder.createDatabase();
      graph.registry.add([Organization, Contact]);

      const dxos = db.add(Obj.make(Organization, { name: 'DXOS' }));
      const braneframe = db.add(Obj.make(Organization, { name: 'Braneframe' }));
      const person = db.add(
        Obj.make(Contact, {
          name: 'John',
          organization: Ref.make(dxos),
          previousEmployment: [Ref.make(dxos), Ref.make(braneframe)],
        }),
      );

      expect(person.previousEmployment![0]!.target?.name).to.eq('DXOS');
      expect(person.previousEmployment![1]!.target?.name).to.eq('Braneframe');
    });
  });

  // Annotations store their values in entity meta. A Ref-valued annotation must persist its
  // unsaved target just like a Ref assigned to an ordinary property does, otherwise the stored
  // DXN dangles and resolution throws EntityNotFoundError (see CollectionModel root collection).
  describe('annotation references', () => {
    const RootCollection = Type.makeObject(DXN.make('com.example.type.rootCollection', '0.1.0'))(
      Schema.Struct({
        name: Schema.optional(Schema.String),
      }),
    );

    const RootRefAnnotation = Annotation.make({
      id: 'com.example.annotation.rootRef',
      schema: Ref.Ref(RootCollection),
    });

    test('Annotation.set persists an unsaved Ref target into the host database', async () => {
      const { db, graph } = await builder.createDatabase();
      graph.registry.add([RootCollection, TestSchema.Example]);

      const host = db.add(Obj.make(TestSchema.Example, { string: 'host' }));
      Obj.update(host, (host) => {
        Annotation.set(host, RootRefAnnotation, Ref.make(Obj.make(RootCollection, { name: 'root' })));
      });

      const ref = Annotation.get(host, RootRefAnnotation).pipe(Option.getOrThrow);
      const target = await ref.load();
      expect(target.name).to.eq('root');
    });

    test('Annotation.set leaves an already-persisted Ref target untouched', async () => {
      const { db, graph } = await builder.createDatabase();
      graph.registry.add([RootCollection, TestSchema.Example]);

      const root = db.add(Obj.make(RootCollection, { name: 'root' }));
      const host = db.add(Obj.make(TestSchema.Example, { string: 'host' }));
      Obj.update(host, (host) => {
        Annotation.set(host, RootRefAnnotation, Ref.make(root));
      });

      const ref = Annotation.get(host, RootRefAnnotation).pipe(Option.getOrThrow);
      expect((await ref.load()).id).to.eq(root.id);
    });
  });

  describe('isDeleted', () => {
    test.skip('throws when accessing meta of a non-reactive-proxy', async () => {
      expect(() => Obj.isDeleted({} as any)).to.throw();
    });

    test('returns false for a non-echo reactive-proxy', async () => {
      const obj = Obj.make(TestSchema.Expando, { string: 'foo' });
      expect(Obj.isDeleted(obj)).to.be.false;
    });

    test('returns false for a non-deleted object', async () => {
      const { db } = await builder.createDatabase();
      const obj = db.add(Obj.make(TestSchema.Expando, { string: 'foo' }));
      expect(Obj.isDeleted(obj)).to.be.false;
    });

    test('returns true for a deleted object', async () => {
      const { db } = await builder.createDatabase();
      const obj = db.add(Obj.make(TestSchema.Expando, { string: 'foo' }));
      db.remove(obj);
      expect(Obj.isDeleted(obj)).to.be.true;
    });
  });

  describe('meta', () => {
    test('throws when accessing meta of a non-reactive-proxy', async () => {
      expect(() => Obj.getMeta({} as any)).to.throw();
    });

    test('can set meta on a non-ECHO object', async () => {
      const obj = Obj.make(TestSchema.Expando, { string: 'foo' });
      expect(Obj.getMeta(obj)).to.deep.eq({ keys: [], tags: [], annotations: {} });
      const testKey = { source: 'test', id: 'hello' };
      Obj.update(obj, (obj) => Obj.getMeta(obj).keys.push(testKey));
      expect(Obj.getMeta(obj)).to.deep.eq({ keys: [testKey], tags: [], annotations: {} });
      expect(() => Obj.update(obj, (obj) => Obj.getMeta(obj).keys.push(1 as any))).to.throw();
    });

    test('meta taken from reactive object when saving to echo', async () => {
      const testKey = { source: 'test', id: 'hello' };
      const reactiveObject = Obj.make(TestSchema.Expando, {});
      Obj.update(reactiveObject, (reactiveObject) => Obj.getMeta(reactiveObject).keys.push(testKey));

      const { db } = await builder.createDatabase();
      const obj = db.add(reactiveObject);
      expect(Obj.getMeta(obj).keys).to.deep.eq([testKey]);
    });

    test('meta updates', async () => {
      const { db } = await builder.createDatabase();
      const obj = db.add(Obj.make(TestSchema.Expando, { string: 'test-1' }));

      expect(Obj.getMeta(obj).keys).to.deep.eq([]);
      const key = { source: 'example.com', id: '123' };
      Obj.update(obj, (obj) => {
        Obj.getMeta(obj).keys.push(key);
      });
      expect(Obj.getMeta(obj).keys).to.deep.eq([key]);
    });

    test('object with meta pushed to array', async () => {
      const NestedType = Type.makeObject(DXN.make('com.example.type.testNested', '0.1.0'))(
        Schema.Struct({
          field: Schema.Number,
        }),
      );
      const TestType = Type.makeObject(DXN.make('com.example.type.test', '0.1.0'))(
        Schema.Struct({
          objects: Schema.Array(Ref.Ref(NestedType)),
        }),
      );

      const key = foreignKey('example.com', '123');
      const { db, graph } = await builder.createDatabase();
      graph.registry.add([TestType, NestedType]);
      const obj = db.add(Obj.make(TestType, { objects: [] }));
      const objectWithMeta = Obj.make(NestedType, { [Obj.Meta]: { keys: [key] }, field: 42 });
      Obj.update(obj, (obj) => {
        obj.objects.push(Ref.make(objectWithMeta));
      });
      expect(Obj.getMeta(obj.objects[0]!.target!).keys).to.deep.eq([key]);
    });

    test('push key to object created with', async () => {
      const TestType = Type.makeObject(DXN.make('com.example.type.test', '0.1.0'))(
        Schema.Struct({
          field: Schema.Number,
        }),
      );
      const { db, graph } = await builder.createDatabase();
      graph.registry.add([TestType]);
      const obj = db.add(Obj.make(TestType, { [Obj.Meta]: { keys: [foreignKey('example.com', '123')] }, field: 1 }));
      Obj.update(obj, (obj) => {
        Obj.getMeta(obj).keys.push(foreignKey('example.com', '456'));
      });
      expect(Obj.getMeta(obj).keys.length).to.eq(2);
    });

    test('can get type reference of unregistered schema', async () => {
      const { db } = await builder.createDatabase();
      const obj = db.add(Obj.make(TestSchema.Expando, { field: 1 }));
      const typeURI = Type.getURI(TestSchema.Example);
      getObjectCore(obj).setType(EncodedReference.fromURI(typeURI));
      expect(Obj.getTypeURI(obj)).to.deep.eq(Type.getURI(TestSchema.Example));
    });

    test('meta persistence', async () => {
      const metaKey = { source: 'example.com', id: '123' };
      const tmpPath = createTmpPath();

      const spaceKey = PublicKey.random();
      const builder = new EchoTestBuilder();
      await openAndClose(builder);
      const peer = await builder.createPeer({ storagePath: tmpPath });
      const root = await peer.host.createSpaceRoot(Context.default(), spaceKey);

      let id: string;
      {
        const db = await peer.openDatabase(spaceKey, root.url);
        const obj = db.add(Obj.make(TestSchema.Expando, { string: 'foo' }));
        id = obj.id;
        Obj.update(obj, (obj) => {
          Obj.getMeta(obj).keys.push(metaKey);
        });
        await db.flush();
        await peer.close();
      }

      {
        const peer = await builder.createPeer({ storagePath: tmpPath });
        const db = await peer.openDatabase(spaceKey, root.url);
        const obj = (await db.query(Filter.id(id)).first()) as TestSchema.Example;
        expect(Obj.getMeta(obj).keys).to.deep.eq([metaKey]);
      }
    });

    test('json serialization with references', async () => {
      const { db } = await builder.createDatabase();

      const org = db.add(Obj.make(TestSchema.Expando, { name: 'DXOS' }));
      const employee = db.add(Obj.make(TestSchema.Expando, { name: 'John', worksAt: Ref.make(org) }));

      const employeeJson = JSON.parse(JSON.stringify(employee));
      expect(employeeJson).to.deep.eq({
        id: employee.id,
        '@meta': { keys: [] },
        '@type': 'dxn:com.example.type.expando:0.1.0',
        name: 'John',
        worksAt: EncodedReference.fromURI(EID.make({ entityId: org.id })),
      });
    });

    test('tags', async () => {
      const { db } = await builder.createDatabase();

      const importantUri = 'echo:/TAGIMPORTANT';
      const org = db.add(
        Obj.make(TestSchema.Expando, {
          name: 'DXOS',
          [Obj.Meta]: { tags: [Ref.fromURI(URI.make(importantUri))] },
        }),
      );

      log.info('', { acc: getObjectCore(org).getDocAccessor([]).handle.doc() });

      expect(Obj.getMeta(org).tags.map((ref) => ref.uri)).toEqual([importantUri]);
    });
  });

  test('assign a non-echo reactive object', async () => {
    const { db } = await builder.createDatabase();

    const obj = db.add(Obj.make(TestSchema.Expando, { title: 'Object 1' }));
    Obj.update(obj, (obj) => {
      obj.ref = Ref.make(Obj.make(TestSchema.Expando, { title: 'Object 2' }));
      obj.refs = [Ref.make(Obj.make(TestSchema.Expando, { title: 'Object 2' }))];
      obj.refMap = {
        ref: Ref.make(Obj.make(TestSchema.Expando, { title: 'Object 3' })),
      };
    });
  });

  describe('object reference assignments', () => {
    test('object field is not an echo object', async () => {
      const { db } = await builder.createDatabase();
      const obj = db.add(Obj.make(TestSchema.Expando, { title: 'Object 1' }));
      Obj.update(obj, (obj) => {
        obj.field = { foo: 'bar' };
      });
      expect(isEchoObject(obj.field)).to.be.false;
    });

    test('nested reactive object is an echo object', async () => {
      const { db } = await builder.createDatabase();
      const obj = db.add(Obj.make(TestSchema.Expando, { title: 'Object 1' }));
      Obj.update(obj, (obj) => {
        obj.field = {
          ref: Ref.make(Obj.make(TestSchema.Expando, { title: 'Object 2' })),
        };
      });
      expect(isEchoObject(obj.field.ref.target)).to.be.true;
    });

    test('nested ref is an echo object', async () => {
      const { db } = await builder.createDatabase();
      const obj = db.add(Obj.make(TestSchema.Expando, { title: 'Object 1' }));
      Obj.update(obj, (obj) => {
        obj.field = {
          ref: Ref.make(Obj.make(TestSchema.Expando, { title: 'Object 2' })),
        };
      });
      expect(isEchoObject(obj.field.ref.target)).to.be.true;
    });

    test('reassign an object field', async () => {
      const { db } = await builder.createDatabase();

      const originalValue = { foo: 'bar', nested: { value: 42 } };
      const obj1 = db.add(Obj.make(TestSchema.Expando, { title: 'Object 1' }));
      Obj.update(obj1, (obj1) => {
        obj1.field = originalValue;
      });
      expect(obj1.field).toEqual(originalValue);

      const obj2 = db.add(Obj.make(TestSchema.Expando, { title: 'Object 2' }));
      Obj.update(obj2, (obj2) => {
        obj2.field = obj1.field;
      });
      expect(obj1.field).toEqual(obj2.field);

      Obj.update(obj1, (obj1) => {
        obj1.field.foo = obj1.field.foo + '_v2';
        obj1.field.nested.value += 1;
      });
      expect(obj1.field.foo).not.toEqual(obj2.field.foo);
      expect(obj1.field.nested.value).not.toEqual(obj2.field.nested.value);
    });

    test('reassign a field with nested echo object', async () => {
      const { db } = await builder.createDatabase();

      const obj1 = db.add(Obj.make(TestSchema.Expando, { title: 'Object 1' }));
      const obj2 = Obj.make(TestSchema.Expando, { title: 'Object 2' });
      Obj.update(obj1, (obj1) => {
        obj1.nested = { object: { ref: Ref.make(obj2) } };
      });
      expect(obj1.nested.object.ref.target).toEqual(obj2);

      const obj3 = db.add(Obj.make(TestSchema.Expando, { title: 'Object 3' }));
      Obj.update(obj3, (obj3) => {
        obj3.nested = obj1.nested;
      });
      expect(obj1.nested.object.ref.target).toEqual(obj3.nested.object.ref.target);

      Obj.update(obj1, (obj1) => {
        obj1.nested.object.ref = Ref.make(Obj.make(TestSchema.Expando, { title: 'Object 4' }));
      });
      expect(obj1.nested.object.ref.target).not.toEqual(obj3.nested.object.ref.target);
    });
  });

  test('typed object is linked with the database on assignment to another db-linked object', async () => {
    const { db, graph } = await builder.createDatabase();
    graph.registry.add([TestSchema.Example]);

    const obj = db.add(Obj.make(TestSchema.Example, { string: 'Object 1' }));
    const another = Obj.make(TestSchema.Example, { string: 'Object 2' });
    Obj.update(obj, (obj) => {
      obj.other = Ref.make(another);
    });
    expect(Obj.getDatabase(another)).not.to.be.undefined;
  });

  test('able to create queue references', async () => {
    const { db } = await builder.createDatabase();
    const uri = EID.make({ spaceId: SpaceId.random(), entityId: EntityId.random() });
    const obj = Obj.make(TestSchema.Expando, { queue: Ref.fromURI(uri) });
    const dbObj = db.add(obj);
    const queueId = EID.getEntityId(uri);
    expect(dbObj.queue.uri).to.include(queueId!);
  });

  test('Obj.getURI returns full DXN', async () => {
    const { db } = await builder.createDatabase();
    const obj = db.add(Obj.make(TestSchema.Expando, { string: 'Object 1' }));
    expect(Obj.getURI(obj)).to.match(/^echo:\/\//);
  });

  test('Obj.getDatabase works with both reactive object and snapshot', async () => {
    const { db } = await builder.createDatabase();
    const obj = db.add(Obj.make(TestSchema.Expando, { title: 'Test' }));

    const snapshot = Obj.getSnapshot(obj);

    const dbFromObj = Obj.getDatabase(obj);
    const dbFromSnapshot = Obj.getDatabase(snapshot);
    expect(dbFromObj).to.equal(db);
    expect(dbFromSnapshot).to.equal(db);
  });

  test('set id throws', async () => {
    const { db } = await builder.createDatabase();
    const obj = db.add(Obj.make(TestSchema.Expando, { string: 'Object 1' }));
    expect(() => {
      (obj as any).id = '123';
    }).to.throw();
  });

  test('foreign key copying from new object to existing object', async () => {
    const { db } = await builder.createDatabase();

    // Create an object in the database.
    const existing = db.add(Obj.make(TestSchema.Expando, { title: 'Existing object' }));
    expect(Obj.getMeta(existing).keys).to.deep.eq([]);

    // Create a new object with foreign keys (not in database).
    const newObj = Obj.make(TestSchema.Expando, { title: 'New object' });
    const foreignKey1 = { source: 'example.com', id: 'key-1' };
    const foreignKey2 = { source: 'another.com', id: 'key-2' };
    Obj.update(newObj, (newObj) => {
      const meta = Obj.getMeta(newObj);
      meta.keys.push(foreignKey1);
      meta.keys.push(foreignKey2);
    });

    // Copy foreign keys from new object to existing object (existing is in database).
    for (const foreignKey of Obj.getMeta(newObj).keys) {
      Obj.update(existing, (existing) => {
        Obj.deleteKeys(existing, foreignKey.source);
        Obj.getMeta(existing).keys.push({ ...foreignKey });
      });
    }

    // Verify foreign keys were copied.
    expect(Obj.getMeta(existing).keys).to.have.length(2);
    expect(Obj.getMeta(existing).keys).to.deep.eq([foreignKey1, foreignKey2]);

    // Verify the original object still has its keys.
    expect(Obj.getMeta(newObj).keys).to.have.length(2);
  });

  describe('Uint8Array fields', () => {
    const Blob = Type.makeObject(DXN.make('com.example.type.blob', '0.1.0'))(
      Schema.Struct({
        name: Schema.String,
        bytes: Schema.Uint8ArrayFromSelf,
      }),
    );

    test('stored natively in automerge and round-trip through ECHO', async ({ expect }) => {
      const { db } = await builder.createDatabase({ types: [Blob] });
      const bytes = new Uint8Array([0, 1, 2, 3, 250, 251, 252, 253, 254, 255]);

      const obj = db.add(Obj.make(Blob, { name: 'blob', bytes }));
      expect(obj.bytes).toBeInstanceOf(Uint8Array);
      expect(Array.from(obj.bytes)).toEqual(Array.from(bytes));

      // Verify the underlying automerge value is a Uint8Array, not the encoded JSON form.
      const core = getObjectCore(obj);
      const raw = core.getDecoded(['data', 'bytes']);
      expect(raw).toBeInstanceOf(Uint8Array);
      expect(Array.from(raw as Uint8Array)).toEqual(Array.from(bytes));
    });
  });
});
