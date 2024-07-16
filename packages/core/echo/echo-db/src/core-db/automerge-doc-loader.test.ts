//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';

import { sleep } from '@dxos/async';
import { Context } from '@dxos/context';
import { AutomergeHost, DataServiceImpl, createIdFromSpaceKey } from '@dxos/echo-pipeline';
import { type SpaceDoc, SpaceDocVersion } from '@dxos/echo-protocol';
import { generateEchoId } from '@dxos/echo-schema';
import { IndexMetadataStore } from '@dxos/indexing';
import { PublicKey } from '@dxos/keys';
import { createTestLevel } from '@dxos/kv-store/testing';
import { describe, openAndClose, test } from '@dxos/test';

import {
  type AutomergeDocumentLoader,
  AutomergeDocumentLoaderImpl,
  type ObjectDocumentLoaded,
} from './automerge-doc-loader';
import { RepoProxy } from '../client';

const ctx = new Context();
const SPACE_KEY = PublicKey.random();
const randomId = () => generateEchoId();

describe('AutomergeDocumentLoader', () => {
  test('space access is set on root doc handle and it is accessible', async () => {
    const { loader, spaceRootDocHandle } = await setupTest();
    expect(loader.getSpaceRootDocHandle()).not.to.throw;
    expect(spaceRootDocHandle.docSync()?.access?.spaceKey).to.eq(SPACE_KEY.toHex());
  });

  test('new object document is linked with space and root document', async () => {
    const objectId = randomId();
    const { loader, spaceRootDocHandle } = await setupTest();
    const objectDocHandle = loader.createDocumentForObject(objectId);
    const handle = spaceRootDocHandle.docSync();
    expect(objectDocHandle.docSync()?.access?.spaceKey).to.eq(SPACE_KEY.toHex());
    expect(handle?.links?.[objectId]).to.eq(objectDocHandle.url);
  });

  test('listener is invoked after a document is loaded', async () => {
    const objectId = randomId();
    const { loader, repo } = await setupTest();
    const handle = repo.create<SpaceDoc>();
    const docLoadInfo = waitForDocumentLoad(loader, { objectId, handle });
    loadLinkedObjects(loader, { [objectId]: handle.url });
    await sleep(10);
    expect(docLoadInfo.loaded).to.be.true;
  });

  test('listener is not invoked if an object was rebound during document loading', async () => {
    const objectId = randomId();
    const { loader, repo } = await setupTest();
    const oldDocHandle = repo.create<SpaceDoc>();
    const newDocHandle = repo.create<SpaceDoc>();
    const docLoadInfo = waitForDocumentLoad(loader, { objectId, handle: oldDocHandle });
    loadLinkedObjects(loader, { [objectId]: oldDocHandle.url });
    loader.onObjectBoundToDocument(newDocHandle, objectId);
    await sleep(10);
    expect(docLoadInfo.loaded).to.be.false;
  });

  test('document link is not loaded if object exists as inline object', async () => {
    const objectId = randomId();
    const { loader, repo } = await setupTest();
    const existingHandle = repo.create<SpaceDoc>();
    loader.onObjectBoundToDocument(existingHandle, objectId);
    const newDocHandle = repo.create<SpaceDoc>();
    const docLoadInfo = waitForDocumentLoad(loader, { objectId, handle: newDocHandle });
    loadLinkedObjects(loader, { [objectId]: existingHandle.url });
    await sleep(10);
    expect(docLoadInfo.loaded).to.be.false;
  });

  const setupTest = async () => {
    const spaceId = await createIdFromSpaceKey(SPACE_KEY);
    const level = createTestLevel();
    await openAndClose(level);

    const host = new AutomergeHost({
      db: level,
      indexMetadataStore: new IndexMetadataStore({ db: level.sublevel('index-metadata') }),
    });
    await openAndClose(host);
    const dataService = new DataServiceImpl({ automergeHost: host, updateIndexes: async () => {} });
    const repo = new RepoProxy(dataService);
    await openAndClose(repo);

    const loader = new AutomergeDocumentLoaderImpl(spaceId, repo, SPACE_KEY);
    const spaceRootDocHandle = createRootDoc(repo);
    await loader.loadSpaceRootDocHandle(ctx, { rootUrl: spaceRootDocHandle.url });
    return { loader, spaceRootDocHandle, repo };
  };

  const createRootDoc = (repo: RepoProxy) => {
    return repo.create<SpaceDoc>({ version: SpaceDocVersion.CURRENT });
  };

  const loadLinkedObjects = (loader: AutomergeDocumentLoader, links: SpaceDoc['links']) => {
    Object.keys(links ?? {}).forEach((objectId) => loader.loadObjectDocument(objectId));
    loader.onObjectLinksUpdated(links);
  };

  const waitForDocumentLoad = (loader: AutomergeDocumentLoader, expected: ObjectDocumentLoaded) => {
    const docLoadInfo = { loaded: false };
    loader.onObjectDocumentLoaded.on((data) => {
      expect(data.objectId).to.eq(expected.objectId);
      expect(data.handle.url).to.eq(expected.handle.url);
      docLoadInfo.loaded = true;
    });
    return docLoadInfo;
  };
});
