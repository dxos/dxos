//
// Copyright 2024 DXOS.org
//

import { Contact } from '@braneframe/types';
import { Trigger, asyncTimeout } from '@dxos/async';
import { getHeads } from '@dxos/automerge/automerge';
import { warnAfterTimeout } from '@dxos/debug';
import { IndexServiceImpl, IndexStore, Indexer } from '@dxos/indexing';
import { log } from '@dxos/log';
import { idCodec } from '@dxos/protocols';
import { IndexKind } from '@dxos/protocols/proto/dxos/echo/indexing';
import { StorageType, createStorage } from '@dxos/random-access-storage';
import { afterTest, describe, test } from '@dxos/test';

import { Client } from '../client';
import { IndexQuerySourceProvider } from '../echo/index-query-source-provider';
import { TestBuilder } from '../testing';

describe.only('Index queries', () => {
  test('basic index queries', async () => {
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

    {
      const receivedIndexedContact = new Trigger();
      const query = space.db.query(Contact.filter());
      query.subscribe((query) => {
        for (const result of query.results) {
          if (result.object instanceof Contact && result.resolution?.source === 'index') {
            receivedIndexedContact.wake();
          }
        }
      }, true);
      await receivedIndexedContact.wait({ timeout: 1000 });
    }
  });
});
