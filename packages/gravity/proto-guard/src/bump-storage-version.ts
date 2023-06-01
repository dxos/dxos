//
// Copyright 2023 DXOS.org
//

import fs from 'node:fs';
import path from 'node:path';

import { Client, Expando, Text } from '@dxos/client';
import { log } from '@dxos/log';

import { expectedExpando, expectedProperties, expectedText } from './expected-objects';
import { getConfig, getPackageDir, getStorageDir, getStorageVersion } from './util';

const main = async () => {
  const newVersion = (getStorageVersion() + 1).toString();
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

  {
    // Bump storage version in .storage-version file
    const filePath = path.join(getPackageDir(), '.storage-version');
    const version = Number(fs.readFileSync(filePath).toString());
    fs.writeFileSync(filePath, `${(version + 1).toString()}\n`);
  }
};

main().catch((err) => log.catch(err));
