//
// Copyright 2023 DXOS.org
//

import { writeFileSync } from 'node:fs';
import path, { join } from 'node:path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import { TextV0Type, DocumentType } from '@braneframe/types';
import { Client } from '@dxos/client';
import { Expando, create } from '@dxos/client/echo';
import { log } from '@dxos/log';
import { STORAGE_VERSION } from '@dxos/protocols';

import { SnapshotsRegistry } from './snapshots-registry';
import { type SnapshotDescription } from './snapshots-registry';
import { dumpSpaces } from './space-json-dump';
import { EXPECTED_JSON_DATA, SNAPSHOTS_DIR, SNAPSHOT_DIR, createConfig, getBaseDataDir } from './util';

/**
 * Generates a snapshot of encoded protocol buffers to check for backwards compatibility.
 */
// TODO(burdon): Create space with different object model types.
const main = async () => {
  {
    // Check if storage for current version does not already exist.
    if (!(STORAGE_VERSION > SnapshotsRegistry.getLatestSnapshot().version)) {
      throw new Error(`Snapshot already exists for current version: ${STORAGE_VERSION}`);
    }
  }
  const baseDir = getBaseDataDir();

  let snapshot: SnapshotDescription;
  {
    const argv = yargs(hideBin(process.argv)).demandCommand(1, 'need the name for snapshot').help().argv;
    const name = argv._[0] as string;
    snapshot = {
      name,
      version: STORAGE_VERSION,
      dataRoot: join('.', SNAPSHOTS_DIR, name, SNAPSHOT_DIR),
      jsonDataPath: path.join('.', SNAPSHOTS_DIR, name, EXPECTED_JSON_DATA),
      timestamp: new Date().toISOString(),
    };
    log.info('creating snapshot', { snapshot });
  }

  let client: Client;
  {
    // Init client.
    client = new Client({ config: createConfig({ dataRoot: path.join(baseDir, snapshot.dataRoot) }) });
    await client.initialize();
    client.addTypes([DocumentType, TextV0Type]);
    await client.halo.createIdentity();
  }

  log.break();

  {
    // Create Space and data.
    const space = await client.spaces.create({ name: 'first-space' });
    // await space.waitUntilReady();

    space.db.add(
      create({
        value: 100,
        string: 'hello world!',
        array: ['one', 'two', 'three'],
      }),
    );
    await space.db.flush();

    // Generate epoch.
    await space.internal.createEpoch();

    // TODO(burdon): Add mutations.
    const expando = space.db.add(create(Expando, { value: 100 }));
    await space.db.flush();
    const document = space.db.add(
      create(
        create(DocumentType, {
          content: create(TextV0Type, { content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.' }),
        }),
      ),
    );
    expando.content = document.content;

    log.info('created spaces');
  }

  {
    // Register snapshot.
    SnapshotsRegistry.registerSnapshot(snapshot);
    // Dump data.
    writeFileSync(join(baseDir, snapshot.jsonDataPath), JSON.stringify(await dumpSpaces(client), null, 2), 'utf-8');
  }

  {
    // Clean up.
    await client.destroy();
  }

  log.info('done');
};

main().catch((err) => log.catch(err));
