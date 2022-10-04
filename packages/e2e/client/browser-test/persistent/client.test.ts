//
// Copyright 2021 DXOS.org
//

import expect from 'expect';
import 'source-map-support/register';

import { Client } from '@dxos/client';
import { createKeyPair } from '@dxos/crypto';

describe('Client - persistent', () => {
  it.skip('reset storage', async () => {
    const client = new Client();
    await client.initialize(); // TODO(marik-d): This line does not work.
    await client.halo.createProfile({
      ...createKeyPair(),
      username: 'Reset test 1'
    });

    expect(client.echo.queryParties().value.length).toBe(0);
    await client.echo.createParty();
    expect(client.echo.queryParties().value.length).toBe(1);

    await client.reset();

    // We create another client instance after reset here because the first one becomes unusable.
    // In a browser this would be modeled as a page reload.
    // TODO(marik-d): Second client fails to initialize in firefox.
    if (browserMocha.context.browser !== 'firefox') {
      const client2 = new Client({
        version: 1,
        runtime: {
          client: {
            storage: {
              persistent: true
            }
          }
        }
      });

      await client2.initialize();
      await client2.halo.createProfile({
        ...createKeyPair(),
        username: 'Reset test 2'
      });
      expect(client2.echo.queryParties().value.length).toBe(0);
    }
  }).timeout(10_000).retries(10);

  /*
  it('MetadataStore save/load', async () => {
    const storage = createStorage({ type: StorageType.IDB });
    const directory = storage.createDirectory('metadata');
    const party_key = PublicKey.random();

    // Create a new metadata store. And adding party.
    {
      const metadataStore = new MetadataStore(directory);
      await metadataStore.addParty(party_key);
    }

    // Create a new metadata store in same directory. And check if loads party.
    {
      const metadataStore = new MetadataStore(directory);
      await metadataStore.load();
      const partyLoaded = metadataStore.getParty(party_key);
      expect(partyLoaded?.key).toEqual(party_key);
    }
  }).retries(10);
  */
});
