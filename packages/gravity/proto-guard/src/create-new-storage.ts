//
// Copyright 2023 DXOS.org
//

import path from 'node:path';

import { Client, Expando, Text } from '@dxos/client';
import { log } from '@dxos/log';

import { expectedExpando, expectedProperties, expectedText } from './expected-objects';
import { bumpStorageVersion, getConfig, getStorageDir, getStorageVersion } from './util';

const main = async () => {
  bumpStorageVersion();

  let client: Client;
  {
    // Init client.
    const newStoragePath = path.join(getStorageDir(), getStorageVersion().toString());
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
