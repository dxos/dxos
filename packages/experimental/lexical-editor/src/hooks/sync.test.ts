//
// Copyright 2021 DXOS.org
//

import debug from 'debug';
import expect from 'expect';
import { it as test } from 'mocha';
import waitForExpect from 'wait-for-expect';
import { applyUpdate, Doc } from 'yjs';

import { Client, defaultConfig } from '@dxos/client';
import { TextModel } from '@dxos/text-model';

const log = debug('dxos:lexical-editor:test');

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

    log(count);
  });

  test.skip('Replication', async () => {
    // TODO(burdon): By default Client uses an in-memory transport (ugly).
    const createPeer = async (username: string) => {
      const config = defaultConfig;
      const client = new Client(config);
      await client.initialize();
      expect(client.initialized).toBeTruthy();

      await client.halo.createProfile({ username });
      expect(client.halo.profile).toBeDefined();

      client.echo.registerModel(TextModel);
      return client;
    };

    const [inviter, invitee] = await Promise.all(Array.from({ length: 2 }).map((_, i) => createPeer(`user-${i}`)));

    const TEST_TYPE = 'example:type/test';

    let descriptor;
    {
      const client = inviter;
      const party = await client.echo.createParty();
      expect(party.key).toBeDefined();
      const { username } = client.halo.profile!;
      ({ descriptor } = await party.createInvitation());
      log(`Created invitation: ${JSON.stringify({ username, party: party.key })}`);
      expect(descriptor).toBeDefined();
    }

    {
      const client = invitee;
      const { username } = client.halo.profile!;
      const invitation = await client.echo.acceptInvitation(descriptor);
      const party = await invitation.getParty();
      expect(party).toBeDefined();
      log(`Accepted invitation: ${JSON.stringify({ username, party: party.key })}`);
    }

    // TODO(burdon): Use TextModel (which has embedded Doc). Delete replicator.
    {
      const client = inviter;
      const { value: parties } = client.echo.queryParties();
      const [party] = parties;
      const item = await party.database.createItem({ model: TextModel, type: TEST_TYPE });
      log(`Created item: ${item.id}`);

      const text = item.model.doc.getText();
      text.insert(0, 'World!');
      text.insert(0, 'Hello');
      text.insert(5, ' ');
    }

    {
      const client = invitee;
      const { value: parties } = client.echo.queryParties();
      const [party] = parties;

      // TODO(burdon): Better way to block for sync to complete.
      // TODO(burdon): Return value from waitForExpect?
      await waitForExpect(() => {
        const result = party.database.select({ type: TEST_TYPE }).exec();
        const { entities: items } = result;
        expect(items).toHaveLength(1);
        const [item] = items;
        log(`Replicated item: ${item.id}`);

        const text = item.model.doc.getText();
        console.log(text.toString());
        expect(text.toString()).toEqual('Hello World!');
      });
    }
  });
});
