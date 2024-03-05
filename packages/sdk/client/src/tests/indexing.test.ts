//
// Copyright 2024 DXOS.org
//

import { Contact } from '@braneframe/types';
import { sleep } from '@dxos/async';
import { getHeads } from '@dxos/automerge/automerge';
import { warnAfterTimeout } from '@dxos/debug';
import { IndexQueryProvider, IndexStore, Indexer } from '@dxos/echo-schema';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { idCodec } from '@dxos/protocols';
import { afterTest, describe, test } from '@dxos/test';

import { Client } from '../client';
import { TestBuilder } from '../testing';

describe('Index queries', () => {
  test.only('basic index queries', async () => {
    const builder = new TestBuilder();
    afterTest(() => builder.destroy());

    const services = builder.createLocal();
    const client = new Client({ services });
    afterTest(() => client.destroy());
    await client.initialize();

    await client.halo.createIdentity();

    const indexer = new Indexer({
      indexStore: new IndexStore({ directory: builder.storage!.createDirectory('index-store') }),
      metadataStore: services.host!.context.indexMetadata,
      loadDocuments: async (ids) =>
        Promise.all(
          ids.map(async (id) => {
            const { documentId, objectId } = idCodec.decode(id);
            const handle = services.host!.context.automergeHost.repo.find(documentId as any);
            await warnAfterTimeout(1000, 'to long to load doc', () => handle.whenReady());
            const doc = handle.docSync();
            const heads = getHeads(doc);
            return { object: { id: objectId, ...doc[objectId] }, currentHash: heads.at(-1)! };
          }),
        ),
    });

    const agentQuerySourceProvider = new IndexQueryProvider({
      indexer,
      loadObjects: (ids) =>
        Promise.all(
          ids.map(async (id) => {
            const { objectId, documentId } = idCodec.decode(id);
            const handle = client.spaces._automergeContext.repo.find(documentId as any);
            await warnAfterTimeout(1000, 'to long to load doc', () => handle.whenReady());
            const doc = handle.docSync();
            const rawSpaceKey = doc.access?.spaceKey ?? doc.experimental_spaceKey;

            if (!rawSpaceKey) {
              throw new Error('Space key is not available');
            }

            const spaceKey = PublicKey.from(rawSpaceKey);
            const space = client.spaces.get(spaceKey);
            await space!.waitUntilReady();
            return space!.db.getObjectById(objectId)!;
          }),
        ),
    });
    client._graph.registerQuerySourceProvider(agentQuerySourceProvider);

    {
      const space = await client.spaces.create();
      await space.waitUntilReady();

      const contact = new Contact({ name: 'John Doe' });
      space.db.add(contact);
      await space.db.flush();
    }

    {
      const query = client.spaces.query(Contact.filter());
      query.subscribe((result) => {
        log('Query result:', result);
      });
      await sleep(2000);
    }
  });
});
