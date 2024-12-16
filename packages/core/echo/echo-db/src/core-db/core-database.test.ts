//
// Copyright 2024 DXOS.org
//

import { effect } from '@preact/signals-core';
import { describe, expect, test } from 'vitest';

import { Trigger } from '@dxos/async';
import { createIdFromSpaceKey, SpaceDocVersion, type SpaceDoc } from '@dxos/echo-protocol';
import { Expando } from '@dxos/echo-schema';
import { registerSignalsRuntime } from '@dxos/echo-signals';
import { PublicKey } from '@dxos/keys';
import { createTestLevel } from '@dxos/kv-store/testing';
import { create, makeRef } from '@dxos/live-object';
import { openAndClose } from '@dxos/test-utils';
import { range } from '@dxos/util';

import { type CoreDatabase } from './core-database';
import { type DocHandleProxy, type RepoProxy } from '../client';
import { getObjectCore, type ReactiveEchoObject } from '../echo-handler';
import { type EchoDatabase, type EchoDatabaseImpl } from '../proxy-db';
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
      expect(docHandles.spaceRootHandle.docSync()?.links?.[object.id].toString()).to.eq(
        docHandles.linkedDocHandles[0].url,
      );
    });

    test('text objects are created in a separate doc and link from the root doc is added', async () => {
      const testBuilder = new EchoTestBuilder();
      await openAndClose(testBuilder);
      const { db } = await testBuilder.createDatabase();
      const object = createTextObject();
      db.add(object);
      const docHandles = getDocHandles(db);
      expect(docHandles.linkedDocHandles.length).to.eq(1);
      expect(docHandles.spaceRootHandle.docSync()?.links?.[object.id].toString()).to.eq(
        docHandles.linkedDocHandles[0].url,
      );
    });

    test('effect nested reference access triggers document loading', async () => {
      registerSignalsRuntime();

      const document = createExpando({ text: makeRef(createTextObject('Hello, world!')) });
      const db = await createClientDbInSpaceWithObject(document);
      const loadedDocument = (await db.query({ id: document.id }).first()!) as Expando;
      expect(loadedDocument).not.to.be.undefined;

      let isFirstInvocation = true;
      const onPropertyLoaded = new Trigger();
      const clearEffect = effect(() => {
        if (isFirstInvocation) {
          expect(loadedDocument.text.target).to.be.undefined;
        } else {
          expect(loadedDocument.text.target?.content).to.eq(document.text.target?.content);
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
      await db.query({ id: textObject.id }).first({ timeout: 1000 });
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
      const newRootDocHandle = createTestRootDoc(db.coreDatabase._repo);
      const newObject = addObjectToDoc(newRootDocHandle, { id: '123', title: 'title ' });
      await db.setSpaceRoot(newRootDocHandle.url);
      const retrievedObject = db.getObjectById(newObject.id);
      expect((retrievedObject as any).title).to.eq(newObject.title);
    });

    test('objects are removed if not present in the new document', async () => {
      const oldObject = createExpando({ title: 'Hello' });
      const db = await createClientDbInSpaceWithObject(oldObject);
      const newRootDocHandle = createTestRootDoc(db.coreDatabase._repo);
      const beforeUpdate = await db.query({ id: oldObject.id }).first();
      expect(beforeUpdate).not.to.be.undefined;
      await db.coreDatabase.updateSpaceState({ rootUrl: newRootDocHandle.url });
      const afterUpdate = db.getObjectById(oldObject.id);
      expect(afterUpdate).to.be.undefined;
    });

    test('preserved objects are rebound to the new root', async () => {
      const originalObj = createExpando({ title: 'Hello' });
      const db = await createClientDbInSpaceWithObject(originalObj);
      const newRootDocHandle = createTestRootDoc(db.coreDatabase._repo);
      newRootDocHandle.change((newDoc: any) => {
        newDoc.links = getDocHandles(db).spaceRootHandle.docSync().links;
      });
      const beforeUpdate = (await db.query({ id: originalObj.id }).first())!;
      expect(getObjectDocHandle(beforeUpdate).url).to.eq(
        getDocHandles(db).spaceRootHandle.docSync().links?.[beforeUpdate.id].toString(),
      );
      await db.coreDatabase.updateSpaceState({ rootUrl: newRootDocHandle.url });
      expect(getObjectDocHandle(beforeUpdate).url).to.eq(
        newRootDocHandle.docSync().links?.[beforeUpdate.id].toString(),
      );
    });

    test('linked objects are loaded on update only if they were loaded before', async () => {
      const stack = createExpando({
        notLoadedDocument: makeRef(createTextObject('text1')),
        loadedDocument: makeRef(createTextObject('text2')),
        partiallyLoadedDocument: makeRef(createTextObject('text3')),
      });
      const db = await createClientDbInSpaceWithObject(stack);
      const newRootDocHandle = createTestRootDoc(db.coreDatabase._repo);
      newRootDocHandle.change((newDoc: any) => {
        newDoc.objects = getObjectDocHandle(stack).docSync().objects;
        newDoc.links = getDocHandles(db).spaceRootHandle.docSync().links;
      });

      await db.query({ id: stack.loadedDocument.target?.id }).run({ timeout: 1000 });

      // trigger loading but don't wait for it to finish
      db.getObjectById(stack.partiallyLoadedDocument.target?.id);

      await db.setSpaceRoot(newRootDocHandle.url);
      db.getObjectById(stack.partiallyLoadedDocument.target?.id);
      expect(db.getObjectById(stack.loadedDocument.target?.id)).not.to.be.undefined;
      expect(db.getObjectById(stack.notLoadedDocument.target?.id)).to.be.undefined;
    });

    test('linked objects can be remapped', async () => {
      const stack = createExpando({
        text1: makeRef(createTextObject('text1')),
        text2: makeRef(createTextObject('text2')),
        text3: makeRef(createTextObject('text3')),
      });
      const db = await createClientDbInSpaceWithObject(stack);
      const newRootDocHandle = createTestRootDoc(db.coreDatabase._repo);

      for (const obj of [stack.text1.target, stack.text2.target, stack.text3.target]) {
        await db.query({ id: obj.id }).run();
      }

      newRootDocHandle.change((newDoc: any) => {
        newDoc.links = getDocHandles(db).spaceRootHandle.docSync().links;
        newDoc.links[stack.text2.target?.id] = newDoc.links[stack.text1.target?.id];
        newDoc.links[stack.text3.target?.id] = newDoc.links[stack.text1.target?.id];
      });

      getObjectDocHandle(db.getObjectById(stack.text1.target?.id)).change((newDoc: any) => {
        newDoc.objects[stack.text2.target?.id] = getObjectDocHandle(stack.text2.target).docSync()?.objects?.[
          stack.text2.target?.id
        ];
        newDoc.objects[stack.text3.target?.id] = getObjectDocHandle(stack.text3.target).docSync()?.objects?.[
          stack.text3.target?.id
        ];
      });

      await db.coreDatabase.updateSpaceState({ rootUrl: newRootDocHandle.url });

      expect((db.getObjectById(stack.text1.target?.id) as any).content).to.eq(stack.text1.target?.content);
      for (const obj of [stack.text1.target, stack.text2.target, stack.text3.target]) {
        const dbObject: any = db.getObjectById(obj.id);
        expect(dbObject.content).to.eq(obj.content);
        expect(getObjectDocHandle(dbObject).url).to.eq(getObjectDocHandle(stack.text1.target).url);
      }
    });

    test('updates are not received on old handles', async () => {
      const obj = createExpando({});
      const db = await createClientDbInSpaceWithObject(obj);
      const oldRootDocHandle = getDocHandles(db).spaceRootHandle;
      const beforeUpdate = addObjectToDoc(oldRootDocHandle, { id: '1', title: 'test' });
      expect((await (db.query({ id: beforeUpdate.id }).first() as any)).title).to.eq(beforeUpdate.title);

      const newRootDocHandle = createTestRootDoc(db.coreDatabase._repo);
      newRootDocHandle.change((newDoc: any) => {
        newDoc.objects = getObjectDocHandle(obj).docSync().objects;
      });
      await db.coreDatabase.updateSpaceState({ rootUrl: newRootDocHandle.url });

      const afterUpdate = addObjectToDoc(oldRootDocHandle, { id: '2', title: 'test2' });
      expect(db.getObjectById(afterUpdate.id)).to.be.undefined;
    });

    test('pending links are loaded', async () => {
      const obj = createTextObject('Hello, world');
      const db = await createClientDbInSpaceWithObject(obj);
      const oldRootDocHandle = getDocHandles(db).spaceRootHandle;
      const newRootDocHandle = createTestRootDoc(db.coreDatabase._repo);
      newRootDocHandle.change((newDoc: any) => {
        newDoc.links = oldRootDocHandle.docSync()?.links;
      });
      oldRootDocHandle.change((newDoc: any) => {
        delete newDoc.links[obj.id];
      });

      const beforeUpdate = db.getObjectById(obj.id);
      expect(beforeUpdate).to.be.undefined;

      await db.coreDatabase.updateSpaceState({ rootUrl: newRootDocHandle.url });

      await db.query({ id: obj.id }).first();
    });

    test('multiple object update', async () => {
      const linksToRemove = range(5).map(() => createExpando());
      const loadedLinks = range(4).map(() => createTextObject('test'));
      const partiallyLoadedLinks = range(3).map(() => createTextObject('test2'));
      const objectsToAdd = range(2).map(() => createExpando());
      const rootObject = [linksToRemove, loadedLinks, partiallyLoadedLinks]
        .flatMap((v: any[]) => v)
        .reduce((acc: Expando, obj: any) => {
          acc[obj.id] = makeRef(obj);
          return acc;
        }, createExpando());

      const db = await createClientDbInSpaceWithObject(rootObject);

      const oldDoc = getDocHandles(db).spaceRootHandle.docSync();
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
        await db.query({ id: obj.id }).first();
      }
      for (const obj of partiallyLoadedLinks) {
        db.getObjectById(obj.id);
      }
      await db.coreDatabase.updateSpaceState({ rootUrl: newRootDocHandle.url });

      for (const obj of linksToRemove) {
        expect(db.getObjectById(obj.id)).to.be.undefined;
      }
      for (const obj of objectsToAdd) {
        expect(getObjectDocHandle(await db.query({ id: obj.id }).first()).url).to.eq(newRootDocHandle.url);
      }
      for (const obj of [...loadedLinks]) {
        expect(getObjectDocHandle(await db.query({ id: obj.id }).first())).not.to.be.undefined;
      }
      for (const obj of partiallyLoadedLinks) {
        await db.query({ id: obj.id }).first();
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
        await db.query({ id: objectId }).first();
        const object = db.getObjectById(objectId);
        expect(object).not.to.be.undefined;
        expect((object as any).title).to.eq('first object');
      }
    });

    test('load object', async () => {
      const object = createExpando({ title: 'Hello' });
      const db = await createClientDbInSpaceWithObject(object);
      await db.query({ id: object.id }).first();
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
  });
});

const getDocHandles = (db: EchoDatabase): DocumentHandles => ({
  spaceRootHandle: db.coreDatabase._automergeDocLoader.getSpaceRootDocHandle(),
  linkedDocHandles: db.coreDatabase._automergeDocLoader.getLinkedDocHandles(),
});

const getObjectDocHandle = (obj: any) => getObjectCore(obj).docHandle!;

const createClientDbInSpaceWithObject = async (
  object: ReactiveEchoObject<any>,
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

const createExpando = (props: any = {}): ReactiveEchoObject<Expando> => {
  return create(Expando, props);
};

const createTextObject = (content: string = ''): ReactiveEchoObject<{ content: string }> => {
  return create(Expando, { content }) as ReactiveEchoObject<{ content: string }>;
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

const createTestRootDoc = (repo: RepoProxy): DocHandleProxy<SpaceDoc> => {
  return repo.create<SpaceDoc>({ version: SpaceDocVersion.CURRENT });
};
