//
// Copyright 2023 DXOS.org
//

import path from 'node:path';

import { Client } from '@dxos/client';
import { Expando, Text } from '@dxos/client/echo';
import { log } from '@dxos/log';
import { STORAGE_VERSION } from '@dxos/protocols';

import { expectedExpando, expectedProperties, expectedText } from './expected-objects';
import { getLatestStorage, getConfig, getStorageDir } from './util';

const main = async () => {
  {
    // Check if storage for current version does not already exist.
    if (!(STORAGE_VERSION > getLatestStorage())) {
      throw new Error(`Storage for current version ${STORAGE_VERSION} already exists`);
    }
  }

  let client: Client;
  {
    // Init client.
    const newStoragePath = path.join(getStorageDir(), STORAGE_VERSION.toString());
    client = new Client({ config: getConfig(newStoragePath) });
    await client.initialize();
  }

  {
    // Init storage.
    await client.halo.createIdentity();

    const space = await client.spaces.create(expectedProperties);
    await space.waitUntilReady();
    space.db.add(new Expando(expectedExpando));
    await space.db.flush();
    await space.internal.createEpoch();
    space.db.add(new Text(expectedText));
    await space.db.flush();
  }

  {
    // Clean up.
    await client.destroy();
  }
};

main().catch((err) => log.catch(err));
