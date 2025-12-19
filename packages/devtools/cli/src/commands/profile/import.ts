//
// Copyright 2025 DXOS.org
//

import { resolve } from 'node:path';

import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as Prompt from '@effect/cli/Prompt';
import * as FileSystem from '@effect/platform/FileSystem';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { ConfigService } from '@dxos/config';
import { log } from '@dxos/log';
import type { Runtime } from '@dxos/protocols/proto/dxos/config';

import { CommandConfig } from '../../services';

export const handler = Effect.fn(function* ({
  file,
  dataDir,
  force,
}: {
  file: string;
  dataDir: Option.Option<string>;
  force: boolean;
}) {
  const dataDirValue = Option.getOrUndefined(dataDir);
  const { json, profile } = yield* CommandConfig;
  const fs = yield* FileSystem.FileSystem;
  const config = yield* ConfigService;

  const { createLevel, createStorageObjects, importProfileData, decodeProfileArchive } = yield* Effect.promise(
    () => import('@dxos/client-services'),
  );

  let storageConfig: Runtime.Client.Storage;
  if (!dataDirValue) {
    if (!force) {
      yield* Console.log(`Will overwrite profile: ${profile}`);
      const confirmed = yield* Prompt.confirm({
        message: `Delete all data? (Profile: ${profile})`,
        initial: false,
      }).pipe(Prompt.run);
      if (!confirmed) {
        return;
      }
    }
    storageConfig = config.values.runtime!.client!.storage!;
  } else {
    const fullPath = resolve(dataDirValue);
    yield* Console.log(`Importing into: ${fullPath}`);
    storageConfig = {
      persistent: true,
      dataRoot: fullPath,
    };
  }

  if (yield* fs.exists(storageConfig.dataRoot!)) {
    log.error('data directory already exists', { path: storageConfig.dataRoot! });
    if (json) {
      yield* Console.log(JSON.stringify({ error: 'Data directory already exists' }, null, 2));
    } else {
      yield* Console.log('Data directory already exists.');
    }
    return;
  }

  const data = yield* fs.readFile(file);

  const archive = decodeProfileArchive(data);
  yield* Console.log(`Importing archive with ${archive.storage.length} entries`);

  const { storage } = createStorageObjects(storageConfig);
  const level = yield* Effect.tryPromise({
    try: () => createLevel(storageConfig),
    catch: (error) => new Error(`Failed to create level: ${error}`),
  });

  yield* Console.log('Beginning profile import...');
  yield* Effect.tryPromise({
    try: () => importProfileData({ storage, level }, archive),
    catch: (error) => new Error(`Failed to import profile data: ${error}`),
  });
  yield* Console.log('Profile import complete');

  if (json) {
    yield* Console.log(JSON.stringify({ success: true, profile, entries: archive.storage.length }, null, 2));
  }
});

export const importCommand = Command.make(
  'import',
  {
    file: Options.text('file').pipe(Options.withDescription('Archive filename.'), Options.withAlias('f')),
    dataDir: Options.text('data-dir').pipe(Options.withDescription('Storage directory.'), Options.optional),
    force: Options.boolean('force', { ifPresent: true }).pipe(Options.withDescription('Skip confirmation prompt.')),
  },
  handler,
).pipe(Command.withDescription('Import profile.'));
