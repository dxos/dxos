//
// Copyright 2023 DXOS.org
//

import { rmSync } from 'node:fs';
import path, { join } from 'node:path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import { Client } from '@dxos/client';
import { create, Expando } from '@dxos/client/echo';
import { ref, S, TypedObject } from '@dxos/echo-schema';
import { log } from '@dxos/log';
import { STORAGE_VERSION } from '@dxos/protocols';
import { CreateEpochRequest } from '@dxos/protocols/proto/dxos/client/services';

import { type SnapshotDescription, SnapshotsRegistry } from './snapshots-registry';
import { SpacesDumper } from './space-json-dump';
import { Todo } from './types';
import { createConfig, EXPECTED_JSON_DATA, getBaseDataDir, SNAPSHOT_DIR, SNAPSHOTS_DIR } from './util';

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

  let client: Client;
  {
    // Init client.
    client = new Client({ config: createConfig({ dataRoot: path.join(baseDir, snapshot.dataRoot) }) });
    await client.initialize();
    client.addTypes([Todo]);
    await client.halo.createIdentity();
    await client.spaces.isReady.wait();
  }

  log.break();

  {
    // Create first space and data.
    const space = await client.spaces.create({ name: 'first-space' });
    await space.waitUntilReady();

    space.db.add(
      create({
        value: 100,
        string: 'hello world!',
        array: ['one', 'two', 'three'],
      }),
    );
    await space.db.flush();

    // Generate epoch.
    const promise = space.db.coreDatabase.rootChanged.waitForCount(1);
    await space.internal.createEpoch({ migration: CreateEpochRequest.Migration.PRUNE_AUTOMERGE_ROOT_HISTORY });
    await promise;
    await space.db.flush();

    const expando = space.db.add(create(Expando, { value: [1, 2, 3] }));
    const todo = space.db.add(
      create(Todo, {
        name: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
      }),
    );
    expando.value.push(todo);
    await space.db.flush();
  }

  {
    // Create second space and data.
    const space = await client.spaces.create({ name: 'second-space' });
    await space.waitUntilReady();

    // Create dynamic schema.

    // TODO(burdon): Should just be example.org/type/Test
    class TestType extends TypedObject({ typename: 'example.org/type/TestType', version: '0.1.0' })({}) {}
    const dynamicSchema = space.db.schema.addSchema(TestType);
    client.addTypes([TestType]);
    const object = space.db.add(create(dynamicSchema, {}));
    dynamicSchema.addColumns({ name: S.String, todo: ref(Todo) });
    object.name = 'Test';
    object.todo = create(Todo, { name: 'Test todo' });
    await space.db.flush();

    // space.db.add(create(Expando, { crossSpaceReference: obj, explanation: 'this tests cross-space references' }));
  }
  log.info('created spaces');

  {
    // Register snapshot.
    SnapshotsRegistry.registerSnapshot(snapshot);
    // Dump data.
    await SpacesDumper.dumpSpaces(client, path.join(baseDir, snapshot.jsonDataPath));
  }

  {
    // Clean up.
    await client.destroy();
  }

  log.info('done');
};

main().catch((err) => log.catch(err));
