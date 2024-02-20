//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';

import { type DocHandle } from '@dxos/automerge/automerge-repo';
import { describe, test } from '@dxos/test';

import { getAutomergeObjectCore } from './automerge-object';
import { type SpaceDoc } from './types';
import { TextObject, TypedObject } from '../object';
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

    test("separate-doc object is treated as inline if it's both linked and inline", async () => {
      const testBuilder = createSpaceFragmentationTestBuilder();
      const firstPeer = await testBuilder.createPeer();
      const object = new TextObject();
      firstPeer.db.add(object);
      const docHandles = getDocHandles(firstPeer);

      const textHandle = docHandles.linkedDocHandles[0]!;
      expect(getAutomergeObjectCore(object).docHandle?.url).to.eq(textHandle.url);
      docHandles.spaceRootHandle.change((newDocument: SpaceDoc) => {
        newDocument.objects = textHandle.docSync()?.objects;
      });

      // The second peer treats text as inline right after opening the document
      const secondPeer = await testBuilder.createPeer(firstPeer.spaceKey, firstPeer.automergeDocId);
      const secondPeerText = secondPeer.db.getObjectById(object.id)!;
      expect(getAutomergeObjectCore(secondPeerText).docHandle?.url).to.eq(docHandles.spaceRootHandle.url);
      // The first peer rebinds its object to space root too
      expect(getAutomergeObjectCore(object).docHandle?.url).to.eq(docHandles.spaceRootHandle.url);
    });
  });
});

const getDocHandles = (peer: TestPeer): DocumentHandles => {
  const handles = Object.values(peer.db.automerge.automerge.repo.handles) as DocHandle<SpaceDoc>[];
  const spaceRootHandle = handles.find((h) => h.url === peer.automergeDocId)!;
  const linkedDocHandles = handles.filter((h) => h.url !== peer.automergeDocId);
  return { spaceRootHandle, linkedDocHandles };
};

interface DocumentHandles {
  spaceRootHandle: DocHandle<SpaceDoc>;
  linkedDocHandles: DocHandle<SpaceDoc>[];
}
