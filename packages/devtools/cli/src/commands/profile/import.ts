//
// Copyright 2022 DXOS.org
//

import { Flags } from '@oclif/core';
import { existsSync } from 'fs';
import { readFile } from 'fs/promises';

import { DX_DATA, getProfilePath } from '@dxos/client-protocol';
import { log } from '@dxos/log';

import { BaseCommand } from '../../base';
import type { Runtime } from '@dxos/protocols/proto/dxos/config';
import { resolve } from 'path';

export default class Import extends BaseCommand<typeof Import> {
  static override description = 'Import profile.';
  static override flags = {
    ...BaseCommand.flags,
    file: Flags.string({
      description: 'Archive filename.',
      required: true,
    }),
    'data-dir': Flags.string({
      description: 'Storage directory.',
    }),
  };

  async run(): Promise<any> {
    const { profile, file, 'dry-run': dryRun, 'data-dir': storageDir } = this.flags;

    const { createLevel, createStorageObjects, importProfileData, decodeProfileArchive } = await import(
      '@dxos/client-services'
    );

    let storageConfig: Runtime.Client.Storage;
    if (!storageDir) {
      log.info('will overwrite profile', { profile });
      storageConfig = this.clientConfig!.get('runtime.client.storage')!;
    } else {
      const fullPath = resolve(storageDir);
      log.info('importing into', { path: fullPath });
      storageConfig = {
        persistent: true,
        dataRoot: fullPath,
      };
    }

    if (existsSync(storageConfig.dataRoot!)) {
      log.error('data directory already exists', { path: storageConfig.dataRoot! });
      throw new Error('Data directory already exists');
    }

    const data = await readFile(file);
    const archive = decodeProfileArchive(data);
    log.info('importing archive', { entries: archive.storage.length });

    if (dryRun) {
      log.info('dry run, skipping import');
      return;
    }

    const { storage } = createStorageObjects(storageConfig);
    const level = await createLevel(storageConfig);

    log.info('begin profile import', { storageConfig });
    await importProfileData({ storage, level }, archive);
    log.info('done profile import');
  }
}
