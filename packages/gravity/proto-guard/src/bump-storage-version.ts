//
// Copyright 2023 DXOS.org
//

import path from 'node:path';

import { Client, Expando, Text } from '@dxos/client';
import { log } from '@dxos/log';

import { expectedExpando, expectedProperties, expectedText } from './expected-objects';
import { getConfig, getLastVersion, getStorageDir } from './util';

const main = async () => {
  const newVersion = (getLastVersion() + 1).toString();
  const newStoragePath = path.join(getStorageDir(), newVersion);

  let client: Client;
  {
    // Init client.
    client = new Client({ config: getConfig(newStoragePath) });
    await client.initialize();
  }

  {
    // Init storage.
    await client.halo.createIdentity();
    const space = await client.createSpace(expectedProperties);
    await space.waitUntilReady();
    space.db.add(new Expando(expectedExpando));
    space.db.add(new Text(expectedText));
  }

  {
    // Clean up.
    await client.destroy();
  }
};

main().catch((err) => log.catch(err));
