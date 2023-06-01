//
// Copyright 2023 DXOS.org
//

import path from 'node:path';

import { Client, Config, Expando, Text } from '@dxos/client';
import { log } from '@dxos/log';

import { expectedExpando, expectedProperties, expectedText } from './expected-objects';
import { getLastVersion, getStorageDir } from './util';

const main = async () => {
  const newVersion = (getLastVersion() + 1).toString();
  const storagePath = path.join(getStorageDir(), newVersion);

  let client: Client;
  {
    // Init client.
    const config = new Config({
      version: 1,
      runtime: { client: { storage: { persistent: true, path: storagePath } } },
    });
    client = new Client({ config });
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
