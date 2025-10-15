//
// Copyright 2024 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { sleep } from '@dxos/async';
import { Context } from '@dxos/context';
import { ObjectId } from '@dxos/echo/internal';
import { AutomergeHost, DataServiceImpl, SpaceStateManager, createIdFromSpaceKey } from '@dxos/echo-pipeline';
import { type DatabaseDirectory, SpaceDocVersion } from '@dxos/echo-protocol';
import { IndexMetadataStore } from '@dxos/indexing';
import { PublicKey, SpaceId } from '@dxos/keys';
import { createTestLevel } from '@dxos/kv-store/testing';
import { openAndClose } from '@dxos/test-utils';

import { RepoProxy } from '../automerge';

import {
  type AutomergeDocumentLoader,
  AutomergeDocumentLoaderImpl,
  type ObjectDocumentLoaded,
} from './automerge-doc-loader';

const ctx = new Context();
const SPACE_KEY = PublicKey.random();

describe('AutomergeDocumentLoader', () => {
  test('space access is set on root doc handle and it is accessible', async () => {
    const { loader, spaceRootDocHandle } = await setupTest();
    expect(loader.getSpaceRootDocHandle()).not.to.throw;
    expect(spaceRootDocHandle.doc()?.access?.spaceKey).to.eq(SPACE_KEY.toHex());
  });

  test('new object document is linked with space and root document', async () => {
    const objectId = ObjectId.random();
    const { loader, spaceRootDocHandle } = await setupTest();
    const objectDocHandle = loader.createDocumentForObject(objectId);
    const handle = spaceRootDocHandle.doc();
    expect(objectDocHandle.doc()?.access?.spaceKey).to.eq(SPACE_KEY.toHex());
    expect(handle?.links?.[objectId].toString()).to.eq(objectDocHandle.url);
  });

  test('listener is invoked after a document is loaded', async () => {
    const objectId = ObjectId.random();
    const { loader, repo } = await setupTest();
    const handle = repo.create<DatabaseDirectory>();
    const docLoadInfo = waitForDocumentLoad(loader, { objectId, handle });
    loadLinkedObjects(loader, { [objectId]: handle.url });
    await sleep(10);
    expect(docLoadInfo.loaded).to.be.true;
  });

  test('listener is not invoked if an object was rebound during document loading', async () => {
    const objectId = ObjectId.random();
    const { loader, repo } = await setupTest();
    const oldDocHandle = repo.create<DatabaseDirectory>();
    const newDocHandle = repo.create<DatabaseDirectory>();
    const docLoadInfo = waitForDocumentLoad(loader, { objectId, handle: oldDocHandle });
    loadLinkedObjects(loader, { [objectId]: oldDocHandle.url });
    loader.onObjectBoundToDocument(newDocHandle, objectId);
    await sleep(10);
    expect(docLoadInfo.loaded).to.be.false;
  });

  test('document link is not loaded if object exists as inline object', async () => {
    const objectId = ObjectId.random();
    const { loader, repo } = await setupTest();
    const existingHandle = repo.create<DatabaseDirectory>();
    loader.onObjectBoundToDocument(existingHandle, objectId);
    const newDocHandle = repo.create<DatabaseDirectory>();
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
    const dataService = new DataServiceImpl({
      automergeHost: host,
      spaceStateManager: new SpaceStateManager(),
      updateIndexes: async () => {},
    });
    const repo = new RepoProxy(dataService, SpaceId.random());
    await openAndClose(repo);

    const loader = new AutomergeDocumentLoaderImpl(repo, spaceId, SPACE_KEY);
    const spaceRootDocHandle = createRootDoc(repo);
    await loader.loadSpaceRootDocHandle(ctx, { rootUrl: spaceRootDocHandle.url });
    return { loader, spaceRootDocHandle, repo };
  };

  const createRootDoc = (repo: RepoProxy) => {
    return repo.create<DatabaseDirectory>({ version: SpaceDocVersion.CURRENT });
  };

  const loadLinkedObjects = (loader: AutomergeDocumentLoader, links: DatabaseDirectory['links']) => {
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
