//
// Copyright 2024 DXOS.org
//

import { effect } from '@preact/signals-core';
import { expect } from 'chai';

import { Trigger } from '@dxos/async';
import { createIdFromSpaceKey } from '@dxos/echo-pipeline';
import { SpaceDocVersion, type SpaceDoc } from '@dxos/echo-protocol';
import { create, type EchoReactiveObject, Expando } from '@dxos/echo-schema';
import { registerSignalRuntime } from '@dxos/echo-signals';
import { PublicKey } from '@dxos/keys';
import { createTestLevel } from '@dxos/kv-store/testing';
import { describe, openAndClose, test } from '@dxos/test';
import { range } from '@dxos/util';

import { type AutomergeContext } from './automerge-context';
import { type CoreDatabase } from './core-database';
import { getObjectCore } from './doc-accessor';
import { type DocHandleProxy } from '../client';
import { type EchoDatabaseImpl, type EchoDatabase } from '../proxy-db';
import { EchoTestBuilder } from '../testing';

describe('CoreDatabase', () => {
  describe('space fragmentation', () => {
    // TODO(mykola): Delete after space fragmentation flag is removed from AutomergeContext.
    // Skipped because it is the only place where space fragmentation is disabled.
    // And default behavior in prod is to have space fragmentation enabled.
    test.skip('objects are created inline if space fragmentation is disabled', async () => {
      const testBuilder = new EchoTestBuilder();
      await openAndClose(testBuilder);
      const { db } = await testBuilder.createDatabase();
      const object = createTextObject();
      db.add(object);
      const docHandles = getDocHandles(db);
      expect(docHandles.linkedDocHandles.length).to.eq(0);
      const rootDoc = docHandles.spaceRootHandle.docSync();
      expect(rootDoc?.objects?.[object.id]).not.to.be.undefined;
    });

    test('objects are created in separate docs', async () => {
      const testBuilder = new EchoTestBuilder();
      await openAndClose(testBuilder);
      const { db } = await testBuilder.createDatabase();
      const object = createExpando();
      db.add(object);
      const docHandles = getDocHandles(db);
      expect(docHandles.linkedDocHandles.length).to.eq(1);
      const rootDoc = docHandles.spaceRootHandle.docSync();
      expect(rootDoc?.objects?.[object.id]).to.be.undefined;
      expect(docHandles.spaceRootHandle.docSync()?.links?.[object.id]).to.eq(docHandles.linkedDocHandles[0].url);
    });

    test('text objects are created in a separate doc and link from the root doc is added', async () => {
      const testBuilder = new EchoTestBuilder();
      await openAndClose(testBuilder);
      const { db } = await testBuilder.createDatabase();
      const object = createTextObject();
      db.add(object);
      const docHandles = getDocHandles(db);
      expect(docHandles.linkedDocHandles.length).to.eq(1);
      expect(docHandles.spaceRootHandle.docSync()?.links?.[object.id]).to.eq(docHandles.linkedDocHandles[0].url);
    });

    test('effect nested reference access triggers document loading', async () => {
      registerSignalRuntime();

      const document = createExpando({ text: createTextObject('Hello, world!') });
      const db = await createClientDbInSpaceWithObject(document);
      const loadedDocument = (await db.loadObjectById(document.id)!) as Expando;
      expect(loadedDocument).not.to.be.undefined;

      let isFirstInvocation = true;
      const onPropertyLoaded = new Trigger();
      const clearEffect = effect(() => {
        if (isFirstInvocation) {
          expect(loadedDocument.text).to.be.undefined;
        } else {
          expect(loadedDocument.text.content).to.eq(document.text.content);
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
      await db.loadObjectById(textObject.id, { timeout: 1000 });
    });

    test("separate-doc object is treated as inline if it's both linked and inline", async () => {
      const object = createTextObject();
      // The second peer treats text as inline right after opening the document
      const db = await createClientDbInSpaceWithObject(object, (handles) => {
        const textHandle = handles.linkedDocHandles[0]!;
        expect(getObjectCore(object).docHandle?.url).to.eq(textHandle.url);
        handles.spaceRootHandle.change((newDocument: SpaceDoc) => {
          newDocument.objects = textHandle.docSync()?.objects;
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
      const newRootDocHandle = createTestRootDoc(db.coreDatabase.automerge);
      const newObject = addObjectToDoc(newRootDocHandle, { id: '123', title: 'title ' });
      await db.setSpaceRoot(newRootDocHandle.url);
      const retrievedObject = db.getObjectById(newObject.id);
      expect((retrievedObject as any).title).to.eq(newObject.title);
    });

    test('objects are removed if not present in the new document', async () => {
      const oldObject = createExpando({ title: 'Hello' });
      const db = await createClientDbInSpaceWithObject(oldObject);
      const newRootDocHandle = createTestRootDoc(db.coreDatabase.automerge);
      const beforeUpdate = await db.loadObjectById(oldObject.id);
      expect(beforeUpdate).not.to.be.undefined;
      await db.coreDatabase.update({ rootUrl: newRootDocHandle.url });
      const afterUpdate = db.getObjectById(oldObject.id);
      expect(afterUpdate).to.be.undefined;
    });

    test('preserved objects are rebound to the new root', async () => {
      const originalObj = createExpando({ title: 'Hello' });
      const db = await createClientDbInSpaceWithObject(originalObj);
      const newRootDocHandle = createTestRootDoc(db.coreDatabase.automerge);
      newRootDocHandle.change((newDoc: any) => {
        newDoc.links = getDocHandles(db).spaceRootHandle.docSync().links;
      });
      const beforeUpdate = (await db.loadObjectById(originalObj.id))!;
      expect(getObjectDocHandle(beforeUpdate).url).to.eq(
        getDocHandles(db).spaceRootHandle.docSync().links?.[beforeUpdate.id],
      );
      await db.coreDatabase.update({ rootUrl: newRootDocHandle.url });
      expect(getObjectDocHandle(beforeUpdate).url).to.eq(newRootDocHandle.docSync().links?.[beforeUpdate.id]);
    });

    test('linked objects are loaded on update only if they were loaded before', async () => {
      const stack = createExpando({
        notLoadedDocument: createTextObject('text1'),
        loadedDocument: createTextObject('text2'),
        partiallyLoadedDocument: createTextObject('text3'),
      });
      const db = await createClientDbInSpaceWithObject(stack);
      const newRootDocHandle = createTestRootDoc(db.coreDatabase.automerge);
      newRootDocHandle.change((newDoc: any) => {
        newDoc.objects = getObjectDocHandle(stack).docSync().objects;
        newDoc.links = getDocHandles(db).spaceRootHandle.docSync().links;
      });

      await db.loadObjectById(stack.loadedDocument.id, { timeout: 1000 });

      // trigger loading but don't wait for it to finish
      db.getObjectById(stack.partiallyLoadedDocument.id);

      await db.setSpaceRoot(newRootDocHandle.url);
      db.getObjectById(stack.partiallyLoadedDocument.id);
      expect(db.getObjectById(stack.loadedDocument.id)).not.to.be.undefined;
      expect(db.getObjectById(stack.notLoadedDocument.id)).to.be.undefined;
    });

    test('linked objects can be remapped', async () => {
      const stack = createExpando({
        text1: createTextObject('text1'),
        text2: createTextObject('text2'),
        text3: createTextObject('text3'),
      });
      const db = await createClientDbInSpaceWithObject(stack);
      const newRootDocHandle = createTestRootDoc(db.coreDatabase.automerge);

      for (const obj of [stack.text1, stack.text2, stack.text3]) {
        await db.loadObjectById(obj.id);
      }

      newRootDocHandle.change((newDoc: any) => {
        newDoc.links = getDocHandles(db).spaceRootHandle.docSync().links;
        newDoc.links[stack.text2.id] = newDoc.links[stack.text1.id];
        newDoc.links[stack.text3.id] = newDoc.links[stack.text1.id];
      });

      getObjectDocHandle(db.getObjectById(stack.text1.id)).change((newDoc: any) => {
        newDoc.objects[stack.text2.id] = getObjectDocHandle(stack.text2).docSync()?.objects?.[stack.text2.id];
        newDoc.objects[stack.text3.id] = getObjectDocHandle(stack.text3).docSync()?.objects?.[stack.text3.id];
      });

      await db.coreDatabase.update({ rootUrl: newRootDocHandle.url });

      expect((db.getObjectById(stack.text1.id) as any).content).to.eq(stack.text1.content);
      for (const obj of [stack.text1, stack.text2, stack.text3]) {
        const dbObject: any = db.getObjectById(obj.id);
        expect(dbObject.content).to.eq(obj.content);
        expect(getObjectDocHandle(dbObject).url).to.eq(getObjectDocHandle(stack.text1).url);
      }
    });

    test('updates are not received on old handles', async () => {
      const obj = createExpando({});
      const db = await createClientDbInSpaceWithObject(obj);
      const oldRootDocHandle = getDocHandles(db).spaceRootHandle;
      const beforeUpdate = addObjectToDoc(oldRootDocHandle, { id: '1', title: 'test' });
      expect((await (db.loadObjectById(beforeUpdate.id) as any)).title).to.eq(beforeUpdate.title);

      const newRootDocHandle = createTestRootDoc(db.coreDatabase.automerge);
      newRootDocHandle.change((newDoc: any) => {
        newDoc.objects = getObjectDocHandle(obj).docSync().objects;
      });
      await db.coreDatabase.update({ rootUrl: newRootDocHandle.url });

      const afterUpdate = addObjectToDoc(oldRootDocHandle, { id: '2', title: 'test2' });
      expect(db.getObjectById(afterUpdate.id)).to.be.undefined;
    });

    test('pending links are loaded', async () => {
      const obj = createTextObject('Hello, world');
      const db = await createClientDbInSpaceWithObject(obj);
      const oldRootDocHandle = getDocHandles(db).spaceRootHandle;
      const newRootDocHandle = createTestRootDoc(db.coreDatabase.automerge);
      newRootDocHandle.change((newDoc: any) => {
        newDoc.links = oldRootDocHandle.docSync()?.links;
      });
      oldRootDocHandle.change((newDoc: any) => {
        delete newDoc.links[obj.id];
      });

      const beforeUpdate = db.getObjectById(obj.id);
      expect(beforeUpdate).to.be.undefined;

      await db.coreDatabase.update({ rootUrl: newRootDocHandle.url });

      await db.loadObjectById(obj.id);
    });

    test('multiple object update', async () => {
      const linksToRemove = range(5).map(() => createExpando());
      const loadedLinks = range(4).map(() => createTextObject('test'));
      const partiallyLoadedLinks = range(3).map(() => createTextObject('test2'));
      const objectsToAdd = range(2).map(() => createExpando());
      const rootObject = [linksToRemove, loadedLinks, partiallyLoadedLinks]
        .flatMap((v: any[]) => v)
        .reduce((acc: Expando, obj: any) => {
          acc[obj.id] = obj;
          return acc;
        }, createExpando());

      const db = await createClientDbInSpaceWithObject(rootObject);

      const oldDoc = getDocHandles(db).spaceRootHandle.docSync();
      const newRootDocHandle = createTestRootDoc(db.coreDatabase.automerge);
      newRootDocHandle.change((newDoc: any) => {
        newDoc.objects = oldDoc.objects ?? {};
        newDoc.links = oldDoc.links;
        linksToRemove.forEach((o) => {
          delete newDoc.links[o.id];
        });
      });

      objectsToAdd.forEach((o) => addObjectToDoc(newRootDocHandle, o));
      for (const obj of loadedLinks) {
        await db.loadObjectById(obj.id);
      }
      for (const obj of partiallyLoadedLinks) {
        db.getObjectById(obj.id);
      }
      await db.coreDatabase.update({ rootUrl: newRootDocHandle.url });

      for (const obj of linksToRemove) {
        expect(db.getObjectById(obj.id)).to.be.undefined;
      }
      for (const obj of objectsToAdd) {
        expect(getObjectDocHandle(await db.loadObjectById(obj.id)).url).to.eq(newRootDocHandle.url);
      }
      for (const obj of [...loadedLinks]) {
        expect(getObjectDocHandle(await db.loadObjectById(obj.id))).not.to.be.undefined;
      }
      for (const obj of partiallyLoadedLinks) {
        await db.loadObjectById(obj.id);
      }
    });

    test('reload objects', async () => {
      const kv = createTestLevel();
      const testBuilder = new EchoTestBuilder();
      await openAndClose(testBuilder);
      const { db } = await testBuilder.createDatabase(kv);
      const object = createExpando({ title: 'first object' });
      db.add(object);

      const spaceKey = db.spaceKey;
      const rootUrl = db.rootUrl!;
      const objectId = object.id;
      await db.flush();
      await db.close();

      {
        const testPeer = await testBuilder.createPeer(kv);
        const db = await testPeer.openDatabase(spaceKey, rootUrl);
        await db.loadObjectById(objectId);
        const object = db.getObjectById(objectId);
        expect(object).not.to.be.undefined;
        expect((object as any).title).to.eq('first object');
      }
    });

    test('load object', async () => {
      const object = createExpando({ title: 'Hello' });
      const db = await createClientDbInSpaceWithObject(object);
      await db.loadObjectById(object.id);
      const loadedObject = db.getObjectById(object.id);
      expect(loadedObject).to.deep.eq(object);
    });

    test('batch load object timeout', async () => {
      const object = createExpando({ title: 'Hello' });
      const db = await createClientDbInSpaceWithObject(object);
      let threw = false;
      try {
        await db.batchLoadObjects(['123', object.id], {
          inactivityTimeout: 20,
        });
      } catch (e) {
        threw = true;
      }
      expect(threw).to.be.true;
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
  });
});

const getDocHandles = (db: EchoDatabase): DocumentHandles => ({
  spaceRootHandle: db.coreDatabase._automergeDocLoader.getSpaceRootDocHandle(),
  linkedDocHandles: db.coreDatabase._automergeDocLoader.getLinkedDocHandles(),
});

const getObjectDocHandle = (obj: any) => getObjectCore(obj).docHandle!;

const createClientDbInSpaceWithObject = async (
  object: EchoReactiveObject<any>,
  onDocumentSavedInSpace?: (handles: DocumentHandles) => void,
): Promise<EchoDatabaseImpl> => {
  const kv = createTestLevel();

  const testBuilder = new EchoTestBuilder();
  await openAndClose(testBuilder);
  const peer1 = await testBuilder.createPeer(kv);
  const spaceKey = PublicKey.random();
  const db1 = await peer1.createDatabase(spaceKey);
  db1.add(object);
  onDocumentSavedInSpace?.(getDocHandles(db1));
  await db1.flush();
  await peer1.close();

  const peer2 = await testBuilder.createPeer(kv);
  return peer2.openDatabase(spaceKey, db1.rootUrl!);
};

const createExpando = (props: any = {}): EchoReactiveObject<Expando> => {
  return create(Expando, props);
};

const createTextObject = (content: string = ''): EchoReactiveObject<{ content: string }> => {
  return create(Expando, { content }) as EchoReactiveObject<{ content: string }>;
};

interface DocumentHandles {
  spaceRootHandle: DocHandleProxy<SpaceDoc>;
  linkedDocHandles: DocHandleProxy<SpaceDoc>[];
}

const addObjectToDoc = <T extends { id: string }>(docHandle: DocHandleProxy<SpaceDoc>, object: T): T => {
  const data: any = { ...object };
  delete data.id;
  docHandle.change((newDoc: any) => {
    newDoc.objects ??= {};
    newDoc.objects[object.id] = { data };
  });
  return object;
};

const createTestRootDoc = (amContext: AutomergeContext): DocHandleProxy<SpaceDoc> => {
  return amContext.repo.create<SpaceDoc>({ version: SpaceDocVersion.CURRENT });
};
