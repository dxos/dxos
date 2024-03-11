//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';
import fs from 'node:fs';
import path from 'node:path';

import { Contact } from '@braneframe/types';
import { Trigger, asyncTimeout, sleep } from '@dxos/async';
import { getHeads } from '@dxos/automerge/automerge';
import { type Space } from '@dxos/client-protocol';
import { warnAfterTimeout } from '@dxos/debug';
import { IndexServiceImpl, IndexStore, Indexer } from '@dxos/indexing';
import { type PublicKey } from '@dxos/keys';
import { idCodec } from '@dxos/protocols';
import { IndexKind } from '@dxos/protocols/proto/dxos/echo/indexing';
import { StorageType, createStorage } from '@dxos/random-access-storage';
import { afterTest, describe, test } from '@dxos/test';

import { Client } from '../client';
import { QueryOptions } from '../echo';
import { IndexQuerySourceProvider } from '../echo/index-query-source-provider';
import { TestBuilder } from '../testing';

describe('Index queries', () => {
  test('indexing stack', async () => {
    const builder = new TestBuilder();
    builder.storage = createStorage({ type: StorageType.RAM });
    afterTest(() => builder.destroy());

    const services = builder.createLocal();
    const client = new Client({ services });
    afterTest(() => client.destroy());
    await client.initialize();

    await client.halo.createIdentity();

    const indexingDone = services.host!.context.indexMetadata.clean.waitForCount(2);
    const indexer = new Indexer({
      indexStore: new IndexStore({ directory: builder.storage!.createDirectory('index-store') }),
      metadataStore: services.host!.context.indexMetadata,
      loadDocuments: async (ids: string[]) => {
        const snapshots = await Promise.all(
          ids.map(async (id) => {
            const { documentId, objectId } = idCodec.decode(id);
            const handle = services.host!.context.automergeHost.repo.find(documentId as any);
            await warnAfterTimeout(1000, 'to long to load doc', () => handle.whenReady());
            const doc = handle.docSync();
            const heads = getHeads(doc);
            return { id, object: doc.objects[objectId], currentHash: heads.at(-1)! };
          }),
        );
        return snapshots.filter((snapshot) => snapshot.object);
      },
    });

    indexer.setIndexConfig({ indexes: [{ kind: IndexKind.Kind.SCHEMA_MATCH }] });
    await indexer.initialize();

    const service = new IndexServiceImpl({ indexer, automergeHost: services.host!.context.automergeHost });
    const agentQuerySourceProvider = new IndexQuerySourceProvider({
      service,
      spaceList: client.spaces,
    });
    client._graph.registerQuerySourceProvider(agentQuerySourceProvider);
    const space = await client.spaces.create();
    {
      await space.waitUntilReady();

      const contact = new Contact({ name: 'John Doe' });
      space.db.add(contact);
      await space.db.flush();
    }
    await asyncTimeout(indexingDone, 1000);

    await queryIndexedContact(space);
  });

  test('index queries work with client', async () => {
    const testStoragePath = fs.mkdtempSync(path.join('tmp', 'client-indexing-'));
    afterTest(() => fs.rmSync(testStoragePath, { recursive: true, force: true }));
    const builder = new TestBuilder();
    afterTest(() => builder.destroy());
    builder.storage = createStorage({ type: StorageType.RAM });

    const services = builder.createLocal();
    const client = new Client({ services });
    afterTest(() => client.destroy());
    await client.initialize();
    await client.halo.createIdentity();
    await client.spaces.setIndexConfig({ indexes: [{ kind: IndexKind.Kind.SCHEMA_MATCH }] });

    const indexingDone = services.host!.context.indexMetadata.clean.waitForCount(2);
    const space = await client.spaces.create();
    {
      await space.waitUntilReady();

      const contact = new Contact({ name: 'John Doe' });
      space.db.add(contact);
      await space.db.flush();
    }

    await asyncTimeout(indexingDone, 1000);
    const indexedContact = await queryIndexedContact(space);
    expect(indexedContact.name).to.equal('John Doe');
    await client.destroy();
    await builder.storage.close();
    builder.destroy();
  });

  test('indexes persists between client restarts', async () => {
    const testStoragePath = fs.mkdtempSync(path.join('tmp', 'client-indexing-'));
    const storage = createStorage({ type: StorageType.NODE, root: testStoragePath });
    afterTest(() => fs.rmSync(testStoragePath, { recursive: true, force: true }));

    let spaceKey: PublicKey;
    {
      const builder = new TestBuilder();
      builder.storage = storage;
      const services = builder.createLocal();
      const client = new Client({ services });
      await client.initialize();
      await client.halo.createIdentity();
      await client.spaces.setIndexConfig({ indexes: [{ kind: IndexKind.Kind.SCHEMA_MATCH }] });

      const indexingDone = services.host!.context.indexMetadata.clean.waitForCount(2);
      await client.spaces.isReady.wait();
      const space = await client.spaces.create();
      {
        await space.waitUntilReady();
        spaceKey = space.key;

        const contact = new Contact({ name: 'John Doe' });
        space.db.add(contact);
        await space.db.flush();
      }

      await asyncTimeout(indexingDone, 1000);

      const indexedContact = await queryIndexedContact(space);
      expect(indexedContact.name).to.equal('John Doe');

      await sleep(200); // Sleep to get services storage to finish writing.
      await client.destroy();
      await builder.storage.close();
      builder.destroy();
    }

    {
      const builder = new TestBuilder();
      afterTest(() => builder.destroy());
      builder.storage = storage;
      const services = builder.createLocal();
      const client = new Client({ services });
      afterTest(() => client.destroy());
      await client.initialize();
      await client.spaces.setIndexConfig({ indexes: [{ kind: IndexKind.Kind.SCHEMA_MATCH }] });

      await client.spaces.isReady.wait();

      const space = client.spaces.get(spaceKey)!;

      await space.waitUntilReady();

      const indexedContact = await queryIndexedContact(space);
      expect(indexedContact.name).to.equal('John Doe');
    }
  });
});

const queryIndexedContact = async (space: Space) => {
  const receivedIndexedContact = new Trigger<Contact>();
  const query = space.db.query(Contact.filter(), { dataLocation: QueryOptions.DataLocation.ALL });
  query.subscribe((query) => {
    for (const result of query.results) {
      if (result.object instanceof Contact && result.resolution?.source === 'index') {
        receivedIndexedContact.wake(result.object);
      }
    }
  }, true);
  return receivedIndexedContact.wait({ timeout: 5000 });
};
