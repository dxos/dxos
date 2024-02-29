//
// Copyright 2024 DXOS.org
//

import { effect } from '@preact/signals-core';
import { expect } from 'chai';

import { Trigger } from '@dxos/async';
import { type DocHandle } from '@dxos/automerge/automerge-repo';
import { registerSignalRuntime } from '@dxos/echo-signals';
import { describe, test } from '@dxos/test';

import { getAutomergeObjectCore } from './automerge-object';
import { type SpaceDoc } from './types';
import { type EchoObject, Expando, TextObject, TypedObject } from '../object';
import { TestBuilder, type TestPeer } from '../testing';

describe('AutomergeDb', () => {
  describe('space fragmentation', () => {
    const createSpaceFragmentationTestBuilder = () => new TestBuilder({ spaceFragmentationEnabled: true });

    test('text objects are created inline if space fragmentation is disabled', async () => {
      const testBuilder = new TestBuilder();
      const testPeer = await testBuilder.createPeer();
      const object = new TextObject();
      testPeer.db.add(object);
      const docHandles = getDocHandles(testPeer);
      expect(docHandles.linkedDocHandles.length).to.eq(0);
      const rootDoc = docHandles.spaceRootHandle.docSync();
      expect(rootDoc?.objects[object.id]).not.to.be.undefined;
    });

    test('non-text objects are created inline in space root doc', async () => {
      const testBuilder = createSpaceFragmentationTestBuilder();
      const testPeer = await testBuilder.createPeer();
      const object = new TypedObject();
      testPeer.db.add(object);
      const docHandles = getDocHandles(testPeer);
      expect(docHandles.linkedDocHandles.length).to.eq(0);
      const rootDoc = docHandles.spaceRootHandle.docSync();
      expect(rootDoc?.objects[object.id]).not.to.be.undefined;
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
      const peerDocument = peer.db.getObjectById<typeof document>(document.id)!;
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
      const onObjectLoaded = new Trigger();
      const unsubscribe = peer.db.query({ id: textObject.id }).subscribe(() => {
        onObjectLoaded.wake();
      });
      const peerTextObject = peer.db.getObjectById<typeof textObject>(textObject.id);
      expect(peerTextObject).to.be.undefined;
      await onObjectLoaded.wait();
      unsubscribe();
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
});

const getDocHandles = (peer: TestPeer): DocumentHandles => {
  const handles = Object.values(peer.db.automerge.automerge.repo.handles) as DocHandle<SpaceDoc>[];
  const spaceRootHandle = handles.find((h) => h.url === peer.automergeDocId)!;
  const linkedDocHandles = handles.filter((h) => h.url !== peer.automergeDocId);
  return { spaceRootHandle, linkedDocHandles };
};

const createPeerInSpaceWithObject = async (
  object: EchoObject,
  onDocumentSavedInSpace?: (handles: DocumentHandles) => void,
): Promise<TestPeer> => {
  const testBuilder = new TestBuilder({ spaceFragmentationEnabled: true });
  const firstPeer = await testBuilder.createPeer();
  firstPeer.db.add(object);
  onDocumentSavedInSpace?.(getDocHandles(firstPeer));
  return testBuilder.createPeer(firstPeer.spaceKey, firstPeer.automergeDocId);
};

interface DocumentHandles {
  spaceRootHandle: DocHandle<SpaceDoc>;
  linkedDocHandles: DocHandle<SpaceDoc>[];
}
