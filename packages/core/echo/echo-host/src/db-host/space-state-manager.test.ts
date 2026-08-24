//
// Copyright 2026 DXOS.org
//

import {
  type AutomergeUrl,
  type DocumentId,
  interpretAsDocumentId,
  stringifyAutomergeUrl,
} from '@automerge/automerge-repo';
import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, onTestFinished, test } from 'vitest';

import { Context } from '@dxos/context';
import {
  type DatabaseDirectory,
  SPACE_ROOT_TYPE,
  SpaceDocVersion,
  type SpaceIdDerivation,
  type SpaceRoot,
  createIdFromRootDocumentId,
  createIdFromSpaceKey,
  documentIdFromUrl,
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
      directory: stringifyAutomergeUrl({ documentId: '4Y8mbUZP4bLTB1LWr8N4TRQY6ZWU' as DocumentId }),
    };

    expect(isSpaceRoot(root)).to.be.true;
    expect(await verifySpaceRoot(root, documentId)).to.be.true;
    expect(await verifySpaceRoot(root, '4Y8mbUZP4bLTB1LWr8N4TRQY6ZWU')).to.be.false;

    // A URL with no document id would otherwise hash to a valid-looking space id.
    expect(() => documentIdFromUrl('automerge:')).to.throw();

    // An unrecognized derivation must not slip through as the unverifiable spaceKey case.
    const malformed = { ...root, idDerivation: 'somethingElse' as SpaceIdDerivation };
    expect(isSpaceRoot(malformed)).to.be.false;
    expect(await verifySpaceRoot(malformed, documentId)).to.be.false;
  });

  test('a migrated space root is not checkable against its document id', async () => {
    // A legacy space keeps its spaceKey-derived id, so the root that gets minted over it cannot
    // reproduce that id — which is exactly what idDerivation records.
    const root: SpaceRoot = {
      type: SPACE_ROOT_TYPE,
      spaceId: await createIdFromSpaceKey(PublicKey.random()),
      idDerivation: 'spaceKey',
      directory: stringifyAutomergeUrl({ documentId: '4Y8mbUZP4bLTB1LWr8N4TRQY6ZWU' as DocumentId }),
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
    let spaceRootDocUrl: AutomergeUrl;
    let credentialsDocUrl: AutomergeUrl;
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

      // The refs are opaque URLs to the store, so real documents stand in for the root and credentials.
      spaceRootDocUrl = (await automergeHost.createDoc({})).url;
      credentialsDocUrl = (await automergeHost.createDoc({})).url;

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

      // Removing the space must not leave references a reused id could inherit.
      await manager.removeSpace(spaceId);
      expect(manager.getSpaceRootRefs(spaceId)).to.be.undefined;

      await manager.close();
      await dispose();
    }
  });

  test('setting space root references on an unknown space fails rather than losing them', async () => {
    const dbPath = join(__dirname, 'test-space-root-refs-unknown.db');
    rmSync(dbPath, { force: true });
    onTestFinished(() => {
      rmSync(dbPath, { force: true });
    });

    const { runtime, dispose } = createTestSqliteRuntime(dbPath);
    onTestFinished(() => {
      void dispose();
    });

    const automergeHost = new AutomergeHost({ runtime });
    await automergeHost.open(Context.default());
    onTestFinished(() => {
      void automergeHost.close();
    });

    const manager = new SpaceStateManager({ runtime });
    await manager.open(Context.default());
    onTestFinished(() => {
      void manager.close();
    });

    // No directory assigned, so there is no row to hold the columns.
    await expect(
      manager.setSpaceRootRefs(SpaceId.random(), {
        spaceRootDocUrl: (await automergeHost.createDoc({})).url,
        idDerivation: 'rootDoc',
      }),
    ).rejects.toThrow();
  });

  test('EchoHost creates a space whose id derives from its space root document', async () => {
    const dbPath = join(__dirname, 'test-create-space-with-root.db');
    rmSync(dbPath, { force: true });
    onTestFinished(() => {
      rmSync(dbPath, { force: true });
    });

    const { runtime, dispose } = createTestSqliteRuntime(dbPath);
    onTestFinished(() => {
      void dispose();
    });

    const host = new EchoHost({ runtime });
    await host.open(Context.default());
    onTestFinished(() => {
      void host.close();
    });

    const { spaceId, spaceRootUrl, directory } = await host.createSpaceWithRootDocument(Context.default());

    // The id is recomputable from the root's own document id — that is what makes the root self-certifying.
    const rootDocumentId = interpretAsDocumentId(spaceRootUrl);
    expect(spaceId).to.equal(await createIdFromRootDocumentId(rootDocumentId));

    // The root is a separate document from the directory it points at.
    expect(directory.url).to.not.equal(spaceRootUrl);
    expect(directory.doc()?.access?.spaceId).to.equal(spaceId);

    const root = await host.loadDoc<SpaceRoot>(Context.default(), spaceRootUrl);
    expect(isSpaceRoot(root?.doc())).to.be.true;
    expect(await verifySpaceRoot(root!.doc()!, rootDocumentId)).to.be.true;
    expect(root!.doc()!.directory).to.equal(directory.url);

    expect(host.getSpaceRootRefs(spaceId)).to.deep.equal({
      spaceRootDocUrl: spaceRootUrl,
      credentialsDocUrl: undefined,
      idDerivation: 'rootDoc',
    });

    // The refs must survive a restart: without them a reopened host cannot tell a rootDoc space
    // from a legacy one, and would re-anchor it under a second root.
    await host.close();
    await dispose();

    const reopened = createTestSqliteRuntime(dbPath);
    onTestFinished(() => {
      void reopened.dispose();
    });
    const reopenedHost = new EchoHost({ runtime: reopened.runtime });
    await reopenedHost.open(Context.default());
    onTestFinished(() => {
      void reopenedHost.close();
    });

    expect(reopenedHost.spaceIds).to.deep.equal([spaceId]);
    expect(reopenedHost.getSpaceRootRefs(spaceId)).to.deep.equal({
      spaceRootDocUrl: spaceRootUrl,
      credentialsDocUrl: undefined,
      idDerivation: 'rootDoc',
    });
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
