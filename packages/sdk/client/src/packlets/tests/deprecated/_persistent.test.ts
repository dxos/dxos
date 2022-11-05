//
// Copyright 2021 DXOS.org
//

// @dxos/mocha platform=browser

import expect from 'expect';
import 'source-map-support/register';

import { createKeyPair } from '@dxos/crypto';

import { Client } from '../../client';

describe.skip('Client - persistent', function () {
  it.skip('reset storage', async function () {
    const client = new Client();
    await client.initialize(); // TODO(dmaretskyi): This line does not work.
    await client.halo.createProfile({
      ...createKeyPair(),
      username: 'test-user-1'
    });

    expect(client.echo.queryParties().value.length).toBe(0);
    await client.echo.createParty();
    expect(client.echo.queryParties().value.length).toBe(1);

    await client.reset();

    // We create another client instance after reset here because the first one becomes unusable.
    // In a browser this would be modeled as a page reload.
    // TODO(dmaretskyi): Second client fails to initialize in firefox.
    if (mochaExecutor.environment !== 'firefox') {
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
        username: 'test-user-2'
      });
      expect(client2.echo.queryParties().value.length).toBe(0);
    }
  })
    .timeout(10_000)
    .retries(10);

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
