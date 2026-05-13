//
// Copyright 2023 DXOS.org
//

import { rmSync } from 'node:fs';
import path, { join } from 'node:path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import { log } from '@dxos/log';
import { STORAGE_VERSION } from '@dxos/protocols';

import { generateSnapshot } from '../generate-snapshot';
import { type SnapshotDescription, SnapshotsRegistry } from '../snapshots-registry';
import { EXPECTED_JSON_DATA, SNAPSHOTS_DIR, SNAPSHOT_DIR, getBaseDataDir } from '../util';

/**
 * Generates a snapshot of encoded protocol buffers to check for backwards compatibility.
 */
// TODO(burdon): Create space with different object model types.
const main = async () => {
  const baseDir = getBaseDataDir();

  let snapshot: SnapshotDescription;
  let argv: yargs.Arguments<{ force: boolean }>;
  {
    argv = yargs(hideBin(process.argv))
      .option({
        force: {
          type: 'boolean',
          alias: 'f',
          describe: 'if `true` overrides existing snapshot with same name',
          default: false,
        },
      })
      .demandCommand(1, 'need the name for snapshot')
      .help().argv;
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

  {
    // Check if snapshot already exists.
    const existingSnapshot = SnapshotsRegistry.getSnapshot(snapshot.name);
    if (existingSnapshot && !argv.force) {
      log.warn('snapshot already exists', { existingSnapshot, newSnapshot: snapshot });
      return;
    }
    rmSync(join(baseDir, snapshot.dataRoot), { recursive: true, force: true });
    SnapshotsRegistry.removeSnapshot({ name: snapshot.name });
  }

  await generateSnapshot(path.join(baseDir, snapshot.dataRoot), path.join(baseDir, snapshot.jsonDataPath));
  SnapshotsRegistry.registerSnapshot(snapshot);

  log.info('done');
};

main().catch((err) => log.catch(err));
