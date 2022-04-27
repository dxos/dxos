//
// Copyright 2021 DXOS.org
//

import expect from 'expect';
import waitForExpect from 'wait-for-expect';
import { applyUpdate, Doc } from 'yjs';

import { Client } from '@dxos/client';
import { TextModel } from '@dxos/text-model';

import { Replicator } from './replicator';

describe('YJS sync', () => {
  // https://docs.yjs.dev/api/delta-format
  // https://docs.yjs.dev/api/document-updates
  // https://docs.yjs.dev/api/shared-types/y.text
  test('YJS updates', async () => {
    let count = 0;
    const docs = Array.from({ length: 3 }).map(() => {
      const doc = new Doc();

      // https://docs.yjs.dev/api/document-updates
      doc.on('update', (update: Uint8Array, origin: any, doc: Doc) => {
        const clientId = doc.clientID;
        docs.forEach(doc => {
          if (doc.clientID !== clientId) {
            applyUpdate(doc, update);
            count++;
          }
        });
      });

      return doc;
    });

    // Update in parallel.
    docs[0].getText().insert(0, 'World!');
    docs[1].getText().insert(0, 'Hello');
    docs[2].getText().insert(5, ' ');

    const expected = 'Hello World!';
    await waitForExpect(() => {
      const match = docs.every(doc => doc.getText().toString() === expected);
      expect(match).toBeTruthy();
    });

    console.log(count); // TODO(burdon): 18!
  });

  test('TextModel', async () => {
    const createPeer = async () => {
      const config = {};
      const client = new Client(config);
      await client.initialize();
      await client.halo.createProfile();

      client.registerModel(TextModel);
      const party = await client.echo.createParty();
      const item = await party.database.createItem({ model: TextModel });
      expect(item.id).toBeDefined();

      return { client, item };
    }

    // TODO(burdon): Connect via memory mesh/swarm.
    const peers = await Promise.all(Array.from({ length: 2 }).map(() => createPeer()));
    expect(peers[0].client).toBeDefined();
    expect(peers[1].client).toBeDefined();

    // TODO(burdon): Use TextModel (which has embedded Doc). Delete replicator.
    // {
    //   const text = model2.doc.getText();
    //   text.applyDelta(delta);
    //   text.insert(6, 'World');
    //   delta = text.toDelta();
    //   console.log(delta);
    // }
    //
    // {
    //   const text = model1.doc.getText();
    //   text.applyDelta(delta);
    //   console.log(text.toString());
    // }
  });
});
