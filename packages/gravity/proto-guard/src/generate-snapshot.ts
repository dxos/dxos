//
// Copyright 2023 DXOS.org
//

import path from 'node:path';

import { Client } from '@dxos/client';
import { Expando, TextObject } from '@dxos/client/echo';
import { log } from '@dxos/log';
import { STORAGE_VERSION } from '@dxos/protocols';

import { data } from './testing';
import { getLatestStorage, getConfig, getStorageDir } from './util';

/**
 * Generates a snapshot of encoded protocol buffers to check for backwards compatibility.
 */
// TODO(burdon): Create space with different object model types.
const main = async () => {
  {
    // Check if storage for current version does not already exist.
    if (!(STORAGE_VERSION > getLatestStorage())) {
      throw new Error(`Snapshot already exists for current version: ${STORAGE_VERSION}`);
    }
  }

  let client: Client;
  {
    // Init client.
    const newStoragePath = path.join(getStorageDir(), STORAGE_VERSION.toString());
    console.log(`creating snapshot: ${newStoragePath}`);
    client = new Client({ config: getConfig(newStoragePath) });
    await client.initialize();
  }

  {
    // Init storage.
    await client.halo.createIdentity();
  }

  {
    // Create Space and data.
    const space = await client.spaces.create(data.space.properties);
    await space.waitUntilReady();

    // TODO(burdon): Add properties (mutations).
    space.db.add(new Expando(data.space.expando));
    await space.db.flush();

    // Generate epoch.
    // TODO(burdon): Generate multiple epochs.
    await space.internal.createEpoch();

    // TODO(burdon): Add mutations.
    space.db.add(new TextObject(data.space.text.content));
    await space.db.flush();
  }

  {
    // Clean up.
    await client.destroy();
  }
};

main().catch((err) => log.catch(err));
