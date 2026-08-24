//
// Copyright 2026 DXOS.org
//

import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, onTestFinished, test } from 'vitest';

import { Context } from '@dxos/context';
import {
  SPACE_ROOT_TYPE,
  type DatabaseDirectory,
  type SpaceRoot,
  SpaceDocVersion,
  createIdFromRootDocumentId,
  createIdFromSpaceKey,
  isSpaceRoot,
  verifySpaceRoot,
} from '@dxos/echo-protocol';
import { PublicKey, SpaceId } from '@dxos/keys';

import { AutomergeHost } from '../automerge';
import { createTestSqliteRuntime } from '../testing';
import { EchoHost } from './echo-host';
import { SpaceStateManager } from './space-state-manager';

describe('SpaceStateManager and EchoHost persistent space store', () => {
  test('SpaceStateManager persists and restores space root mappings', async () => {
    const dbPath = join(__dirname, 'test-space-state-manager.db');
    rmSync(dbPath, { force: true });
    onTestFinished(() => {
      rmSync(dbPath, { force: true });
    });

    const spaceId = SpaceId.random();
    let docId: string;

    // Phase 1: Create, assign, and persist
    {
      const { runtime, dispose } = createTestSqliteRuntime(dbPath);
      onTestFinished(() => {
        void dispose();
      });

      const automergeHost = new AutomergeHost({ runtime });
      await automergeHost.open(Context.default());
      onTestFinished(() => {
        void automergeHost.close();
      });

      const handle = await automergeHost.createDoc<DatabaseDirectory>({
        version: SpaceDocVersion.CURRENT,
        objects: {},
        links: {},
      });
      docId = handle.documentId;
      const query = automergeHost.findWithProgress<DatabaseDirectory>(handle.documentId);

      const manager = new SpaceStateManager({ runtime });
      await manager.open(Context.default());
      onTestFinished(() => {
        void manager.close();
      });

      const root = await manager.assignRootToSpace(spaceId, query);
      expect(root.documentId).to.equal(docId);
      expect(manager.spaceIds).to.deep.equal([spaceId]);
      expect(manager.getSpaceRootDocumentId(spaceId)).to.equal(docId);

      // Verify getPersistedSpaces
      const persisted = manager.getPersistedSpaces();
      expect(persisted).to.have.length(1);
      expect(persisted[0].spaceId).to.equal(spaceId);
      expect(persisted[0].rootDocUrl).to.equal(handle.url);

      await manager.close();
      await automergeHost.close();
      await dispose();
    }

    // Phase 2: Restore from same database
    {
      const { runtime, dispose } = createTestSqliteRuntime(dbPath);
      onTestFinished(() => {
        void dispose();
      });

      const manager = new SpaceStateManager({ runtime });
      await manager.open(Context.default());
      onTestFinished(() => {
        void manager.close();
      });

      // Should be loaded from SQLite on open
      expect(manager.spaceIds).to.deep.equal([spaceId]);
      expect(manager.getSpaceRootDocumentId(spaceId)).to.equal(docId);

      const persisted = manager.getPersistedSpaces();
      expect(persisted).to.have.length(1);
      expect(persisted[0].spaceId).to.equal(spaceId);
      expect(persisted[0].rootDocUrl).to.equal(`automerge:${docId}`);

      // Test removeSpace
      await manager.removeSpace(spaceId);
      expect(manager.spaceIds).to.have.length(0);
      expect(manager.getSpaceRootDocumentId(spaceId)).to.be.undefined;
      expect(manager.getPersistedSpaces()).to.have.length(0);

      await manager.close();
      await dispose();
    }
  });

  test('space id derives from the root document id, stably and in SpaceId shape', async () => {
    const spaceId = await createIdFromRootDocumentId('3Y8mbUZP4bLTB1LWr8N4TRQY6ZWU');
    expect(SpaceId.isValid(spaceId)).to.be.true;
    expect(await createIdFromRootDocumentId('3Y8mbUZP4bLTB1LWr8N4TRQY6ZWU')).to.equal(spaceId);
    expect(await createIdFromRootDocumentId('4Y8mbUZP4bLTB1LWr8N4TRQY6ZWU')).to.not.equal(spaceId);

    // Fixed vector: the derivation is a wire contract, so a change here breaks every existing space.
    expect(spaceId).to.equal('BPBU3KVI3MDFWXLLDCR2KKAO35OHLF754');
  });

  test('a rootDoc space root verifies against its own document id and rejects another', async () => {
    const documentId = '3Y8mbUZP4bLTB1LWr8N4TRQY6ZWU';
    const root: SpaceRoot = {
      type: SPACE_ROOT_TYPE,
      spaceId: await createIdFromRootDocumentId(documentId),
      idDerivation: 'rootDoc',
      directory: 'automerge:4Y8mbUZP4bLTB1LWr8N4TRQY6ZWU',
    };

    expect(isSpaceRoot(root)).to.be.true;
    expect(await verifySpaceRoot(root, documentId)).to.be.true;
    expect(await verifySpaceRoot(root, '4Y8mbUZP4bLTB1LWr8N4TRQY6ZWU')).to.be.false;
  });

  test('a migrated space root is not checkable against its document id', async () => {
    // A legacy space keeps its spaceKey-derived id, so the root that gets minted over it cannot
    // reproduce that id — which is exactly what idDerivation records.
    const root: SpaceRoot = {
      type: SPACE_ROOT_TYPE,
      spaceId: await createIdFromSpaceKey(PublicKey.random()),
      idDerivation: 'spaceKey',
      directory: 'automerge:4Y8mbUZP4bLTB1LWr8N4TRQY6ZWU',
    };

    expect(await verifySpaceRoot(root, '3Y8mbUZP4bLTB1LWr8N4TRQY6ZWU')).to.be.true;
  });

  test('SpaceStateManager persists space root references and keeps them across a directory rotation', async () => {
    const dbPath = join(__dirname, 'test-space-root-refs.db');
    rmSync(dbPath, { force: true });
    onTestFinished(() => {
      rmSync(dbPath, { force: true });
    });

    const spaceId = SpaceId.random();
    const spaceRootDocUrl = 'automerge:3Y8mbUZP4bLTB1LWr8N4TRQY6ZWU' as const;
    const credentialsDocUrl = 'automerge:5Y8mbUZP4bLTB1LWr8N4TRQY6ZWU' as const;
    let rotatedDirectoryId: string;

    {
      const { runtime, dispose } = createTestSqliteRuntime(dbPath);
      const automergeHost = new AutomergeHost({ runtime });
      await automergeHost.open(Context.default());
      const manager = new SpaceStateManager({ runtime });
      await manager.open(Context.default());

      const directory = async () => {
        const handle = await automergeHost.createDoc<DatabaseDirectory>({
          version: SpaceDocVersion.CURRENT,
          objects: {},
          links: {},
        });
        return automergeHost.findWithProgress<DatabaseDirectory>(handle.documentId);
      };

      await manager.assignRootToSpace(spaceId, await directory());
      expect(manager.getSpaceRootRefs(spaceId)).to.be.undefined;

      await manager.setSpaceRootRefs(spaceId, { spaceRootDocUrl, credentialsDocUrl, idDerivation: 'rootDoc' });
      expect(manager.getSpaceRootRefs(spaceId)?.spaceRootDocUrl).to.equal(spaceRootDocUrl);

      // Rotating the directory must not disturb the immutable root — the upsert writes only root_doc_url.
      const rotated = await manager.assignRootToSpace(spaceId, await directory());
      rotatedDirectoryId = rotated.documentId;
      expect(manager.getSpaceRootRefs(spaceId)?.spaceRootDocUrl).to.equal(spaceRootDocUrl);

      await manager.close();
      await automergeHost.close();
      await dispose();
    }

    {
      const { runtime, dispose } = createTestSqliteRuntime(dbPath);
      const manager = new SpaceStateManager({ runtime });
      await manager.open(Context.default());

      expect(manager.getSpaceRootDocumentId(spaceId)).to.equal(rotatedDirectoryId);
      expect(manager.getSpaceRootRefs(spaceId)).to.deep.equal({
        spaceRootDocUrl,
        credentialsDocUrl,
        idDerivation: 'rootDoc',
      });

      await manager.close();
      await dispose();
    }
  });

  test('EchoHost openSpaceRoot works without url on reopened host', async () => {
    const dbPath = join(__dirname, 'test-echo-host-persistent.db');
    rmSync(dbPath, { force: true });
    onTestFinished(() => {
      rmSync(dbPath, { force: true });
    });

    const spaceKey = PublicKey.random();
    const spaceId = await createIdFromSpaceKey(spaceKey);

    // Phase 1: Create space on host 1
    {
      const { runtime, dispose } = createTestSqliteRuntime(dbPath);
      onTestFinished(() => {
        void dispose();
      });

      const host = new EchoHost({ runtime });
      await host.open(Context.default());
      onTestFinished(() => {
        void host.close();
      });

      const root = await host.createSpaceRoot(Context.default(), spaceKey);
      expect(root).to.exist;
      expect(host.spaceIds).to.deep.equal([spaceId]);
      expect(host.spaces).to.have.length(1);
      expect(host.spaces[0].spaceId).to.equal(spaceId);

      await host.close();
      await dispose();
    }

    // Phase 2: Open space without URL on host 2 and update it
    {
      const { runtime, dispose } = createTestSqliteRuntime(dbPath);
      onTestFinished(() => {
        void dispose();
      });

      const host = new EchoHost({ runtime });
      await host.open(Context.default());
      onTestFinished(() => {
        void host.close();
      });

      // Space should be listed immediately because of persisted state loading
      expect(host.spaceIds).to.deep.equal([spaceId]);
      expect(host.spaces).to.have.length(1);

      // Open space root without passing URL — should resolve from persistent store
      const root = await host.openSpaceRoot(Context.default(), spaceId);
      expect(root).to.exist;
      expect(root.getSpaceKey()).to.equal(spaceKey.toHex());

      // Update space root with a new document URL (simulating epoch arrival)
      const anotherHandle = await host.createDoc<DatabaseDirectory>({
        version: SpaceDocVersion.CURRENT,
        objects: {},
        links: {},
      });
      const updatedRoot = await host.updateSpaceRoot(Context.default(), spaceId, anotherHandle.url);
      expect(updatedRoot).to.exist;
      expect(updatedRoot.url).to.equal(anotherHandle.url);
      expect(host.spaces[0].rootDocUrl).to.equal(anotherHandle.url);

      // Test removeSpace
      await host.removeSpace(spaceId);
      expect(host.spaceIds).to.have.length(0);
      expect(host.spaces).to.have.length(0);

      await host.close();
      await dispose();
    }
  });
});
