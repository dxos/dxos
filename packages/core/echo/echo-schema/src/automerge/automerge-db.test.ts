//
// Copyright 2024 DXOS.org
//

import { effect } from '@preact/signals-core';
import { expect } from 'chai';

import { Trigger } from '@dxos/async';
import { type DocHandle } from '@dxos/automerge/automerge-repo';
import { registerSignalRuntime } from '@dxos/echo-signals';
import { describe, test } from '@dxos/test';
import { range } from '@dxos/util';

import { getAutomergeObjectCore } from './automerge-object';
import { type SpaceDoc } from './types';
import { type EchoObject, Expando, TextObject, TypedObject } from '../object';
import { TestBuilder, type TestPeer } from '../testing';

describe('AutomergeDb', () => {
  describe('space fragmentation', () => {
    const createSpaceFragmentationTestBuilder = () => new TestBuilder({ spaceFragmentationEnabled: true });

    test('objects are created inline if space fragmentation is disabled', async () => {
      const testBuilder = new TestBuilder();
      const testPeer = await testBuilder.createPeer();
      const object = new TextObject();
      testPeer.db.add(object);
      const docHandles = getDocHandles(testPeer);
      expect(docHandles.linkedDocHandles.length).to.eq(0);
      const rootDoc = docHandles.spaceRootHandle.docSync();
      expect(rootDoc?.objects[object.id]).not.to.be.undefined;
    });

    test('objects are created in separate docs', async () => {
      const testBuilder = createSpaceFragmentationTestBuilder();
      const testPeer = await testBuilder.createPeer();
      const object = new TypedObject();
      testPeer.db.add(object);
      const docHandles = getDocHandles(testPeer);
      expect(docHandles.linkedDocHandles.length).to.eq(1);
      const rootDoc = docHandles.spaceRootHandle.docSync();
      expect(rootDoc?.objects?.[object.id]).to.be.undefined;
      expect(docHandles.spaceRootHandle.docSync()?.links[object.id]).to.eq(docHandles.linkedDocHandles[0].url);
    });

    test('text objects are created in a separate doc and link from the root doc is added', async () => {
      const testBuilder = createSpaceFragmentationTestBuilder();
      const testPeer = await testBuilder.createPeer();
      const object = new TextObject();
      testPeer.db.add(object);
      const docHandles = getDocHandles(testPeer);
      expect(docHandles.linkedDocHandles.length).to.eq(1);
      expect(docHandles.spaceRootHandle.docSync()?.links[object.id]).to.eq(docHandles.linkedDocHandles[0].url);
    });

    test('effect nested reference access triggers document loading', async () => {
      registerSignalRuntime();

      const document = new Expando({ text: new TextObject('Hello, world!') });
      const peer = await createPeerInSpaceWithObject(document);
      const peerDocument = (await peer.db.automerge.loadObjectById(document.id)!) as Expando;
      expect(peerDocument).not.to.be.undefined;

      let isFirstInvocation = true;
      const onPropertyLoaded = new Trigger();
      const clearEffect = effect(() => {
        if (isFirstInvocation) {
          expect(peerDocument.text).to.be.undefined;
        } else {
          expect(peerDocument.text.content).to.eq(document.text.content);
          onPropertyLoaded.wake();
        }
        isFirstInvocation = false;
      });
      await onPropertyLoaded.wait();
      clearEffect();
    });

    test('reference access triggers document loading', async () => {
      const textObject = new TextObject('Hello, world!');
      const peer = await createPeerInSpaceWithObject(textObject);
      await waitObjectLoaded(peer, textObject, { triggerLoading: true });
    });

    test("separate-doc object is treated as inline if it's both linked and inline", async () => {
      const object = new TextObject();
      // The second peer treats text as inline right after opening the document
      const peer = await createPeerInSpaceWithObject(object, (handles) => {
        const textHandle = handles.linkedDocHandles[0]!;
        expect(getAutomergeObjectCore(object).docHandle?.url).to.eq(textHandle.url);
        handles.spaceRootHandle.change((newDocument: SpaceDoc) => {
          newDocument.objects = textHandle.docSync()?.objects;
        });
      });
      const peerText = peer.db.getObjectById(object.id)!;
      expect(peerText).not.to.be.undefined;
      const spaceRootHandle = getDocHandles(peer).spaceRootHandle;
      expect(getAutomergeObjectCore(peerText).docHandle?.url).to.eq(spaceRootHandle.url);
      // The first peer rebinds its object to space root too
      expect(getAutomergeObjectCore(object).docHandle?.url).to.eq(spaceRootHandle.url);
    });
  });

  describe('space root document change', () => {
    test('new inline objects are loaded', async () => {
      const peer = await createPeerInSpaceWithObject(new TextObject());
      const newRootDocHandle = peer.db._automerge.automerge.repo.create<SpaceDoc>();
      const newObject = addObjectToDoc(newRootDocHandle, { id: '123', title: 'title ' });
      await peer.db._automerge.update({ rootUrl: newRootDocHandle.url });
      const retrievedObject = peer.db.getObjectById(newObject.id);
      expect((retrievedObject as any).title).to.eq(newObject.title);
    });

    test('objects are removed if not present in the new document', async () => {
      const oldObject = new Expando({ title: 'Hello' });
      const peer = await createPeerInSpaceWithObject(oldObject);
      const newRootDocHandle = peer.db._automerge.automerge.repo.create<SpaceDoc>();
      const beforeUpdate = await peer.db._automerge.loadObjectById(oldObject.id);
      expect(beforeUpdate).not.to.be.undefined;
      await peer.db._automerge.update({ rootUrl: newRootDocHandle.url });
      const afterUpdate = peer.db.getObjectById(oldObject.id);
      expect(afterUpdate).to.be.undefined;
    });

    test('preserved objects are rebound to the new root', async () => {
      const originalObj = new Expando({ title: 'Hello' });
      const peer = await createPeerInSpaceWithObject(originalObj);
      const newRootDocHandle = peer.db._automerge.automerge.repo.create<SpaceDoc>();
      newRootDocHandle.change((newDoc: any) => {
        newDoc.links = getDocHandles(peer).spaceRootHandle.docSync().links;
      });
      const beforeUpdate = await peer.db.automerge.loadObjectById(originalObj.id)!;
      expect(getObjectDocHandle(beforeUpdate).url).to.eq(
        getDocHandles(peer).spaceRootHandle.docSync().links[beforeUpdate.id],
      );
      await peer.db._automerge.update({ rootUrl: newRootDocHandle.url });
      expect(getObjectDocHandle(beforeUpdate).url).to.eq(newRootDocHandle.docSync().links[beforeUpdate.id]);
    });

    test('linked objects are loaded on update only if they were loaded before', async () => {
      const stack = new Expando({
        notLoadedDocument: new TextObject('text1'),
        loadedDocument: new TextObject('text2'),
        partiallyLoadedDocument: new TextObject('text3'),
      });
      const peer = await createPeerInSpaceWithObject(stack);
      const newRootDocHandle = peer.db._automerge.automerge.repo.create<SpaceDoc>();
      newRootDocHandle.change((newDoc: any) => {
        newDoc.objects = getObjectDocHandle(stack).docSync().objects;
        newDoc.links = getDocHandles(peer).spaceRootHandle.docSync().links;
      });

      await waitObjectLoaded(peer, stack.loadedDocument, { triggerLoading: true, timeout: 1000 });
      // trigger loading but don't wait for it to finish
      peer.db.getObjectById(stack.partiallyLoadedDocument.id);

      await peer.db._automerge.update({ rootUrl: newRootDocHandle.url });
      await waitObjectLoaded(peer, stack.partiallyLoadedDocument, { triggerLoading: false });
      expect(peer.db.getObjectById(stack.loadedDocument.id)).not.to.be.undefined;
      expect(peer.db.getObjectById(stack.notLoadedDocument.id)).to.be.undefined;
    });

    test('linked objects can be remapped', async () => {
      const stack = new Expando({
        text1: new TextObject('text1'),
        text2: new TextObject('text2'),
        text3: new TextObject('text3'),
      });
      const peer = await createPeerInSpaceWithObject(stack);
      const newRootDocHandle = peer.db._automerge.automerge.repo.create<SpaceDoc>();
      newRootDocHandle.change((newDoc: any) => {
        newDoc.links = getDocHandles(peer).spaceRootHandle.docSync().links;
        newDoc.links[stack.text2.id] = newDoc.links[stack.text1.id];
        newDoc.links[stack.text3.id] = newDoc.links[stack.text1.id];
      });
      getObjectDocHandle(stack.text1).change((newDoc: any) => {
        newDoc.objects[stack.text2.id] = getObjectDocHandle(stack.text2).docSync()?.objects[stack.text2.id];
        newDoc.objects[stack.text3.id] = getObjectDocHandle(stack.text3).docSync()?.objects[stack.text3.id];
      });
      for (const obj of [stack.text1, stack.text2, stack.text3]) {
        await waitObjectLoaded(peer, obj, { triggerLoading: true });
      }

      await peer.db._automerge.update({ rootUrl: newRootDocHandle.url });
      expect((peer.db.getObjectById(stack.text1.id) as any).content).to.eq(stack.text1.content);
      for (const obj of [stack.text1, stack.text2, stack.text3]) {
        const dbObject: any = peer.db.getObjectById(obj.id);
        expect(dbObject.content).to.eq(obj.content);
        expect(getObjectDocHandle(dbObject).url).to.eq(getObjectDocHandle(stack.text1).url);
      }
    });

    test('updates are not received on old handles', async () => {
      const obj = new Expando({});
      const peer = await createPeerInSpaceWithObject(obj);
      const oldRootDocHandle = getDocHandles(peer).spaceRootHandle;
      const beforeUpdate = addObjectToDoc(oldRootDocHandle, { id: '1', title: 'test' });
      expect((await (peer.db.automerge.loadObjectById(beforeUpdate.id) as any)).title).to.eq(beforeUpdate.title);

      const newRootDocHandle = peer.db._automerge.automerge.repo.create<SpaceDoc>();
      newRootDocHandle.change((newDoc: any) => {
        newDoc.objects = getObjectDocHandle(obj).docSync().objects;
      });
      await peer.db._automerge.update({ rootUrl: newRootDocHandle.url });

      const afterUpdate = addObjectToDoc(oldRootDocHandle, { id: '2', title: 'test2' });
      expect(peer.db.getObjectById(afterUpdate.id)).to.be.undefined;
    });

    test('pending links are loaded', async () => {
      const obj = new TextObject('Hello, world');
      const peer = await createPeerInSpaceWithObject(obj);
      const oldRootDocHandle = getDocHandles(peer).spaceRootHandle;
      const newRootDocHandle = peer.db._automerge.automerge.repo.create<SpaceDoc>();
      console.log(oldRootDocHandle.docSync());
      newRootDocHandle.change((newDoc: any) => {
        newDoc.links = oldRootDocHandle.docSync()?.links;
      });
      oldRootDocHandle.change((newDoc: any) => {
        delete newDoc.links[obj.id];
      });

      const beforeUpdate = peer.db.getObjectById(obj.id);
      expect(beforeUpdate).to.be.undefined;

      await peer.db._automerge.update({ rootUrl: newRootDocHandle.url });

      await waitObjectLoaded(peer, obj, { triggerLoading: false });
    });

    test('multiple object update', async () => {
      const objectsToRebind = range(6).map(() => new Expando({}));
      const objectsToRemove = range(5).map(() => new Expando({}));
      const loadedLinks = range(4).map(() => new TextObject('test'));
      const partiallyLoadedLinks = range(3).map(() => new TextObject('test2'));
      const objectsToAdd = range(2).map(() => new Expando({}));
      const rootObject = [objectsToRebind, objectsToRemove, loadedLinks, partiallyLoadedLinks]
        .flatMap((v: any[]) => v)
        .reduce((acc: Expando, obj: any) => {
          acc[obj.id] = obj;
          return acc;
        }, new Expando({}));

      const peer = await createPeerInSpaceWithObject(rootObject);

      const oldDoc = getDocHandles(peer).spaceRootHandle.docSync();
      const newRootDocHandle = peer.db._automerge.automerge.repo.create<SpaceDoc>();
      newRootDocHandle.change((newDoc: any) => {
        newDoc.objects = oldDoc.objects ?? {};
        newDoc.links = oldDoc.links;
        objectsToRemove.forEach((o) => delete newDoc.objects[o.id]);
      });
      objectsToAdd.forEach((o) => addObjectToDoc(newRootDocHandle, o));
      for (const obj of loadedLinks) {
        await waitObjectLoaded(peer, obj, { triggerLoading: true });
      }
      for (const obj of partiallyLoadedLinks) {
        peer.db.getObjectById(obj.id);
      }

      await peer.db._automerge.update({ rootUrl: newRootDocHandle.url });

      for (const obj of objectsToRemove) {
        expect(peer.db.getObjectById(obj.id)).to.be.undefined;
      }
      for (const obj of objectsToRebind) {
        expect(getObjectDocHandle(await peer.db.automerge.loadObjectById(obj.id)).url).to.eq(
          (await newRootDocHandle.doc()).links[obj.id],
        );
      }
      for (const obj of objectsToAdd) {
        expect(getObjectDocHandle(await peer.db.automerge.loadObjectById(obj.id)).url).to.eq(newRootDocHandle.url);
      }
      for (const obj of [...loadedLinks]) {
        expect(getObjectDocHandle(await peer.db.automerge.loadObjectById(obj.id))).not.to.be.undefined;
      }
      for (const obj of partiallyLoadedLinks) {
        await waitObjectLoaded(peer, obj, { triggerLoading: false });
      }
    });

    test('reload objects', async () => {
      const testBuilder = new TestBuilder({ spaceFragmentationEnabled: true });
      const testPeer = await testBuilder.createPeer();
      const object = new TypedObject({ title: 'first object' });
      testPeer.db.add(object);

      const spaceKey = testPeer.spaceKey;
      const docId = testPeer.automergeDocId;
      const objectId = object.id;
      {
        const testPeer = await testBuilder.createPeer(spaceKey, docId);
        await testPeer.db.automerge.loadObjectById(objectId);
        const object = testPeer.db.getObjectById(objectId);
        expect(object).not.to.be.undefined;
        expect((object as any).title).to.eq('first object');
      }
    });

    test('load object', async () => {
      const object = new Expando({ title: 'Hello' });
      const peer = await createPeerInSpaceWithObject(object);
      await peer.db.automerge.loadObjectById(object.id);
      const loadedObject = peer.db.getObjectById(object.id);
      expect(loadedObject).to.deep.eq(object);
    });
  });
});

const getDocHandles = (peer: TestPeer): DocumentHandles => {
  const handles = Object.values(peer.db.automerge.automerge.repo.handles) as DocHandle<SpaceDoc>[];
  const spaceRootHandle = handles.find((h) => h.url === peer.automergeDocId)!;
  const linkedDocHandles = handles.filter((h) => h.url !== peer.automergeDocId);
  return { spaceRootHandle, linkedDocHandles };
};

const getObjectDocHandle = (obj: any) => getAutomergeObjectCore(obj).docHandle!;

const createPeerInSpaceWithObject = async (
  object: EchoObject,
  onDocumentSavedInSpace?: (handles: DocumentHandles) => void,
): Promise<TestPeer> => {
  const testBuilder = new TestBuilder({ spaceFragmentationEnabled: true });
  const firstPeer = await testBuilder.createPeer();
  firstPeer.db.add(object);
  await firstPeer.db.flush();
  onDocumentSavedInSpace?.(getDocHandles(firstPeer));
  return testBuilder.createPeer(firstPeer.spaceKey, firstPeer.automergeDocId);
};

interface DocumentHandles {
  spaceRootHandle: DocHandle<SpaceDoc>;
  linkedDocHandles: DocHandle<SpaceDoc>[];
}

const waitObjectLoaded = async (peer: TestPeer, obj: any, options: { triggerLoading: boolean; timeout?: number }) => {
  const onObjectLoaded = new Trigger();
  const query = peer.db.query({ id: obj.id });
  const unsubscribe = query.subscribe(() => {
    onObjectLoaded.wake();
  });
  if (options.triggerLoading) {
    const peerTextObject = peer.db.getObjectById(obj.id);
    expect(peerTextObject).to.be.undefined;
  }
  if (query.objects.find((o) => o.id === obj.id) == null) {
    await onObjectLoaded.wait({ timeout: options.timeout });
  }
  unsubscribe();
};

const addObjectToDoc = <T extends { id: string }>(docHandle: DocHandle<SpaceDoc>, object: T): T => {
  const data: any = { ...object };
  delete data.id;
  docHandle.change((newDoc: any) => {
    newDoc.objects ??= {};
    newDoc.objects[object.id] = { data };
  });
  return object;
};
