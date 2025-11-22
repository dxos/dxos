//
// Copyright 2024 DXOS.org
//

import { effect } from '@preact/signals-core';
import { describe, expect, test } from 'vitest';

import { Trigger } from '@dxos/async';
import { Filter, Obj, Type } from '@dxos/echo';
import { Ref, getType } from '@dxos/echo/internal';
import { Testing } from '@dxos/echo/testing';
import { type DatabaseDirectory, SpaceDocVersion, createIdFromSpaceKey } from '@dxos/echo-protocol';
import { registerSignalsRuntime } from '@dxos/echo-signals';
import { ObjectId } from '@dxos/keys';
import { DXN, PublicKey } from '@dxos/keys';
import { createTestLevel } from '@dxos/kv-store/testing';
import { openAndClose } from '@dxos/test-utils';
import { range } from '@dxos/util';

import { type DocHandleProxy, type RepoProxy } from '../automerge';
import { type AnyLiveObject, getObjectCore } from '../echo-handler';
import { type EchoDatabase, type EchoDatabaseImpl } from '../proxy-db';
import { Query } from '../query';
import { EchoTestBuilder, createTmpPath } from '../testing';

import { type CoreDatabase } from './core-database';

describe('CoreDatabase', () => {
  describe('space fragmentation', () => {
    test('objects are created in separate docs', async () => {
      const testBuilder = new EchoTestBuilder();
      await openAndClose(testBuilder);
      const { db } = await testBuilder.createDatabase();
      const object = Obj.make(Type.Expando, {});
      db.add(object);
      const docHandles = getDocHandles(db);
      expect(docHandles.linkedDocHandles.length).to.eq(1);
      const rootDoc = docHandles.spaceRootHandle.doc();
      expect(rootDoc?.objects?.[object.id]).to.be.undefined;
      expect(docHandles.spaceRootHandle.doc()?.links?.[object.id].toString()).to.eq(docHandles.linkedDocHandles[0].url);
    });

    test('text objects are created in a separate doc and link from the root doc is added', async () => {
      const testBuilder = new EchoTestBuilder();
      await openAndClose(testBuilder);
      const { db } = await testBuilder.createDatabase();
      const object = createTextObject();
      db.add(object);
      const docHandles = getDocHandles(db);
      expect(docHandles.linkedDocHandles.length).to.eq(1);
      expect(docHandles.spaceRootHandle.doc()?.links?.[object.id].toString()).to.eq(docHandles.linkedDocHandles[0].url);
    });

    test('effect nested reference access triggers document loading', async () => {
      registerSignalsRuntime();

      const document = Obj.make(Type.Expando, { text: Ref.make(createTextObject('Hello, world!')) });
      const db = await createClientDbInSpaceWithObject(document);
      const loadedDocument = await db.query(Query.type(Type.Expando, { id: document.id })).first();
      expect(loadedDocument).not.to.be.undefined;

      let isFirstInvocation = true;
      const onPropertyLoaded = new Trigger();
      const clearEffect = effect(() => {
        if (isFirstInvocation) {
          expect(loadedDocument.text.target).to.be.undefined;
        } else {
          expect(loadedDocument.text.target?.content).to.eq('Hello, world!');
          onPropertyLoaded.wake();
        }
        isFirstInvocation = false;
      });
      await onPropertyLoaded.wait();
      clearEffect();
    });

    test('reference access triggers document loading', async () => {
      const textObject = createTextObject('Hello, world!');
      const db = await createClientDbInSpaceWithObject(textObject);
      await db.query(Query.type(Type.Expando, { id: textObject.id })).first({ timeout: 1000 });
    });

    test("separate-doc object is treated as inline if it's both linked and inline", async () => {
      const object = createTextObject();
      // The second peer treats text as inline right after opening the document
      const db = await createClientDbInSpaceWithObject(object, (handles) => {
        const textHandle = handles.linkedDocHandles[0]!;
        expect(getObjectCore(object).docHandle?.url).to.eq(textHandle.url);
        handles.spaceRootHandle.change((newDocument: DatabaseDirectory) => {
          newDocument.objects = textHandle.doc()?.objects;
        });
        textHandle.change((newDocument: any) => {
          newDocument.objects = {};
        });
      });
      const text = db.getObjectById(object.id)!;
      expect(text).not.to.be.undefined;
      const spaceRootHandle = getDocHandles(db).spaceRootHandle;
      expect(getObjectCore(text).docHandle?.url).to.eq(spaceRootHandle.url);
      // The first peer rebinds its object to space root too
      expect(getObjectCore(object).docHandle?.url).to.eq(spaceRootHandle.url);
    });
  });

  describe('space root document change', () => {
    test('new inline objects are loaded', async () => {
      const db = await createClientDbInSpaceWithObject(createTextObject());
      const newRootDocHandle = createTestRootDoc(db.coreDatabase._repo);
      const newObject = addObjectToDoc(newRootDocHandle, { id: ObjectId.random(), title: 'title ' });
      await db.setSpaceRoot(newRootDocHandle.url);
      const retrievedObject = db.getObjectById(newObject.id);
      expect((retrievedObject as any).title).to.eq(newObject.title);
    });

    test('objects are removed if not present in the new document', async () => {
      const oldObject = Obj.make(Type.Expando, { title: 'Hello' });
      const db = await createClientDbInSpaceWithObject(oldObject);
      const newRootDocHandle = createTestRootDoc(db.coreDatabase._repo);
      const beforeUpdate = await db.query(Query.type(Type.Expando, { id: oldObject.id })).first();
      expect(beforeUpdate).not.to.be.undefined;
      await db.coreDatabase.updateSpaceState({ rootUrl: newRootDocHandle.url });
      const afterUpdate = db.getObjectById(oldObject.id);
      expect(afterUpdate).to.be.undefined;
    });

    test('preserved objects are rebound to the new root', async () => {
      const originalObj = Obj.make(Type.Expando, { title: 'Hello' });
      const db = await createClientDbInSpaceWithObject(originalObj);
      const newRootDocHandle = createTestRootDoc(db.coreDatabase._repo);
      newRootDocHandle.change((newDoc: any) => {
        newDoc.links = getDocHandles(db).spaceRootHandle.doc().links;
      });
      const beforeUpdate = await db.query(Query.type(Type.Expando, { id: originalObj.id })).first();
      expect(getObjectDocHandle(beforeUpdate).url).to.eq(
        getDocHandles(db).spaceRootHandle.doc().links?.[beforeUpdate.id].toString(),
      );
      await db.coreDatabase.updateSpaceState({ rootUrl: newRootDocHandle.url });
      expect(getObjectDocHandle(beforeUpdate).url).to.eq(newRootDocHandle.doc().links?.[beforeUpdate.id].toString());
    });

    test('linked objects are loaded on update only if they were loaded before', async () => {
      const stack = Obj.make(Type.Expando, {
        notLoadedDocument: Ref.make(createTextObject('text1')),
        loadedDocument: Ref.make(createTextObject('text2')),
        partiallyLoadedDocument: Ref.make(createTextObject('text3')),
      });

      const partiallyLoadedDocumentId = stack.partiallyLoadedDocument.target?.id;
      const loadedDocumentId = stack.loadedDocument.target?.id;
      const notLoadedDocumentId = stack.notLoadedDocument.target?.id;

      const db = await createClientDbInSpaceWithObject(stack);
      const newRootDocHandle = createTestRootDoc(db.coreDatabase._repo);
      newRootDocHandle.change((newDoc: any) => {
        newDoc.objects = getObjectDocHandle(stack).doc().objects;
        newDoc.links = getDocHandles(db).spaceRootHandle.doc().links;
      });

      await db.query(Query.type(Type.Expando, { id: loadedDocumentId })).run({ timeout: 1000 });

      // trigger loading but don't wait for it to finish
      db.getObjectById(partiallyLoadedDocumentId);

      await db.setSpaceRoot(newRootDocHandle.url);
      db.getObjectById(loadedDocumentId);
      expect(db.getObjectById(loadedDocumentId)).not.to.be.undefined;
      expect(db.getObjectById(notLoadedDocumentId)).to.be.undefined;
    });

    test('linked objects can be remapped', async () => {
      const stack = Obj.make(Type.Expando, {
        text1: Ref.make(createTextObject('text1')),
        text2: Ref.make(createTextObject('text2')),
        text3: Ref.make(createTextObject('text3')),
      });
      const ids = [stack.text1.target?.id, stack.text2.target?.id, stack.text3.target?.id];
      const contents = [stack.text1.target?.content, stack.text2.target?.content, stack.text3.target?.content];
      const db = await createClientDbInSpaceWithObject(stack);
      const newRootDocHandle = createTestRootDoc(db.coreDatabase._repo);

      for (const id of ids) {
        await db.query(Query.type(Type.Expando, { id })).run();
      }

      newRootDocHandle.change((newDoc: any) => {
        newDoc.links = getDocHandles(db).spaceRootHandle.doc().links;
        newDoc.links[ids[1]] = newDoc.links[ids[0]];
        newDoc.links[ids[2]] = newDoc.links[ids[0]];
      });

      getObjectDocHandle(db.getObjectById(ids[0])).change((newDoc: any) => {
        newDoc.objects[ids[1]] = getObjectDocHandle(db.getObjectById(ids[1])).doc()?.objects?.[ids[1]];
        newDoc.objects[ids[2]] = getObjectDocHandle(db.getObjectById(ids[2])).doc()?.objects?.[ids[2]];
      });

      await db.coreDatabase.updateSpaceState({ rootUrl: newRootDocHandle.url });

      expect((db.getObjectById(ids[0]) as any).content).to.eq(contents[0]);
      for (const id of ids) {
        const dbObject: any = db.getObjectById(id);
        expect(dbObject.content).to.eq(contents[ids.indexOf(id)]);
        expect(getObjectDocHandle(dbObject).url).to.eq(getObjectDocHandle(db.getObjectById(ids[0])).url);
      }
    });

    test('updates are not received on old handles', async () => {
      const obj = Obj.make(Type.Expando, {});
      const db = await createClientDbInSpaceWithObject(obj);
      const oldRootDocHandle = getDocHandles(db).spaceRootHandle;
      const id1 = ObjectId.random();
      const id2 = ObjectId.random();
      const beforeUpdate = addObjectToDoc(oldRootDocHandle, { id: id1, title: 'test' });
      expect((await db.query(Query.type(Type.Expando, { id: beforeUpdate.id })).first()).title).to.eq(
        beforeUpdate.title,
      );

      const newRootDocHandle = createTestRootDoc(db.coreDatabase._repo);
      newRootDocHandle.change((newDoc: any) => {
        newDoc.objects = getObjectDocHandle(obj).doc().objects;
      });
      await db.coreDatabase.updateSpaceState({ rootUrl: newRootDocHandle.url });

      const afterUpdate = addObjectToDoc(oldRootDocHandle, { id: id2, title: 'test2' });
      expect(db.getObjectById(afterUpdate.id)).to.be.undefined;
    });

    test('pending links are loaded', async () => {
      const obj = createTextObject('Hello, world');
      const db = await createClientDbInSpaceWithObject(obj);
      const oldRootDocHandle = getDocHandles(db).spaceRootHandle;
      const newRootDocHandle = createTestRootDoc(db.coreDatabase._repo);
      newRootDocHandle.change((newDoc: any) => {
        newDoc.links = oldRootDocHandle.doc()?.links;
      });
      oldRootDocHandle.change((newDoc: any) => {
        delete newDoc.links[obj.id];
      });

      const beforeUpdate = db.getObjectById(obj.id);
      expect(beforeUpdate).to.be.undefined;

      await db.coreDatabase.updateSpaceState({ rootUrl: newRootDocHandle.url });

      await db.query(Filter.ids(obj.id)).first();
    });

    test('multiple object update', async () => {
      const linksToRemove = range(5).map(() => Obj.make(Type.Expando, {}));
      const loadedLinks = range(4).map(() => createTextObject('test'));
      const partiallyLoadedLinks = range(3).map(() => createTextObject('test2'));
      const objectsToAdd = range(2).map(() => Obj.make(Type.Expando, {}));
      const rootObject = [linksToRemove, loadedLinks, partiallyLoadedLinks]
        .flatMap((v: any[]) => v)
        .reduce(
          (acc: Type.Expando, obj: any) => {
            acc[obj.id] = Ref.make(obj);
            return acc;
          },
          Obj.make(Type.Expando, {}),
        );

      const db = await createClientDbInSpaceWithObject(rootObject);

      const oldDoc = getDocHandles(db).spaceRootHandle.doc();
      const newRootDocHandle = createTestRootDoc(db.coreDatabase._repo);
      newRootDocHandle.change((newDoc: any) => {
        newDoc.objects = oldDoc.objects ?? {};
        newDoc.links = oldDoc.links;
        linksToRemove.forEach((o) => {
          delete newDoc.links[o.id];
        });
      });

      objectsToAdd.forEach((o) => addObjectToDoc(newRootDocHandle, o));
      for (const obj of loadedLinks) {
        await db.query(Filter.ids(obj.id)).first();
      }
      for (const obj of partiallyLoadedLinks) {
        db.getObjectById(obj.id);
      }
      await db.coreDatabase.updateSpaceState({ rootUrl: newRootDocHandle.url });

      for (const obj of linksToRemove) {
        expect(db.getObjectById(obj.id)).to.be.undefined;
      }
      for (const obj of objectsToAdd) {
        expect(getObjectDocHandle(await db.query(Query.type(Type.Expando, { id: obj.id })).first()).url).to.eq(
          newRootDocHandle.url,
        );
      }
      for (const obj of [...loadedLinks]) {
        expect(getObjectDocHandle(await db.query(Query.type(Type.Expando, { id: obj.id })).first())).not.to.be
          .undefined;
      }
      for (const obj of partiallyLoadedLinks) {
        await db.query(Query.type(Type.Expando, { id: obj.id })).first();
      }
    });

    test('reload objects', async () => {
      const tmpPath = createTmpPath();
      const testBuilder = new EchoTestBuilder();
      await openAndClose(testBuilder);
      const kv = createTestLevel(tmpPath);
      const peer = await testBuilder.createPeer({ kv });
      const db = await peer.createDatabase();
      const object = Obj.make(Type.Expando, { title: 'first object' });
      db.add(object);

      const spaceKey = db.spaceKey;
      const rootUrl = db.rootUrl!;
      const objectId = object.id;
      await db.flush();
      await peer.close();

      {
        const kv = createTestLevel(tmpPath);
        const testPeer = await testBuilder.createPeer({ kv });
        const db = await testPeer.openDatabase(spaceKey, rootUrl);
        await db.query(Filter.ids(objectId)).first();
        const object = db.getObjectById(objectId);
        expect(object).not.to.be.undefined;
        expect((object as any).title).to.eq('first object');
      }
    });

    test('load object', async () => {
      const object = Obj.make(Type.Expando, { title: 'Hello' });
      const db = await createClientDbInSpaceWithObject(object);
      await db.query(Filter.ids(object.id)).first();
      const loadedObject = db.getObjectById(object.id);
      expect(loadedObject).to.deep.eq(object);
    });

    describe('getAllObjectIds', () => {
      test('returns empty array when closed', async () => {
        const testBuilder = new EchoTestBuilder();
        await testBuilder.open();
        const fakeUrl = '3DXhC1rjp3niGHfM76tNP56URi8H';
        const peer = await testBuilder.createPeer();
        const spaceKey = PublicKey.random();
        let coreDb: CoreDatabase;
        {
          // Create db.
          const root = await peer.host.createSpaceRoot(spaceKey);
          // NOTE: Client closes the database when it is closed.
          const spaceId = await createIdFromSpaceKey(spaceKey);
          const db = peer.client.constructDatabase({ spaceId, spaceKey });
          void db.setSpaceRoot(root.url);
          coreDb = db.coreDatabase;
        }
        expect(coreDb.getAllObjectIds()).to.deep.eq([]);
        void coreDb.open({ rootUrl: fakeUrl });
        const barrier = new Trigger();
        setTimeout(() => barrier.wake());
        await barrier.wait();
        expect(coreDb.getAllObjectIds()).to.deep.eq([]);
      });
    });

    // TODO(dmaretskyi): Test for conflict resolution.
    test('atomic replace object', async () => {
      const testBuilder = new EchoTestBuilder();
      await openAndClose(testBuilder);
      const { db, graph } = await testBuilder.createDatabase();
      graph.schemaRegistry.addSchema([Testing.Person]);
      const contact = db.add(Obj.make(Testing.Person, { name: 'Foo' }));

      await db._coreDatabase.atomicReplaceObject(contact.id, {
        type: DXN.parse('dxn:type:example.com/type/Task:0.1.0'),
        data: { name: 'Bar' },
      });

      expect(contact.name).to.eq('Bar');
      expect(getType(contact)?.toString()).to.eq('dxn:type:example.com/type/Task:0.1.0');
    });
  });
});

const getDocHandles = (db: EchoDatabase): DocumentHandles => ({
  spaceRootHandle: db.coreDatabase._automergeDocLoader.getSpaceRootDocHandle(),
  linkedDocHandles: db.coreDatabase._automergeDocLoader.getLinkedDocHandles(),
});

const getObjectDocHandle = (obj: any) => getObjectCore(obj).docHandle!;

const createClientDbInSpaceWithObject = async (
  object: AnyLiveObject<any>,
  onDocumentSavedInSpace?: (handles: DocumentHandles) => void,
): Promise<EchoDatabaseImpl> => {
  const tmpPath = createTmpPath();

  const testBuilder = new EchoTestBuilder();
  await openAndClose(testBuilder);
  const peer1 = await testBuilder.createPeer({ kv: createTestLevel(tmpPath) });
  const spaceKey = PublicKey.random();
  const db1 = await peer1.createDatabase(spaceKey);
  db1.add(object);
  onDocumentSavedInSpace?.(getDocHandles(db1));
  await db1.flush();
  await peer1.close();

  const peer2 = await testBuilder.createPeer({ kv: createTestLevel(tmpPath) });
  return peer2.openDatabase(spaceKey, db1.rootUrl!);
};

const createTextObject = (content: string = '') => Obj.make(Type.Expando, { content });

interface DocumentHandles {
  spaceRootHandle: DocHandleProxy<DatabaseDirectory>;
  linkedDocHandles: DocHandleProxy<DatabaseDirectory>[];
}

const addObjectToDoc = <T extends { id: string }>(docHandle: DocHandleProxy<DatabaseDirectory>, object: T): T => {
  const data: any = { ...object };
  delete data.id;
  docHandle.change((newDoc: any) => {
    newDoc.objects ??= {};
    newDoc.objects[object.id] = { data };
  });
  return object;
};

const createTestRootDoc = (repo: RepoProxy): DocHandleProxy<DatabaseDirectory> => {
  return repo.create<DatabaseDirectory>({ version: SpaceDocVersion.CURRENT });
};
