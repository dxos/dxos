//
// Copyright 2022 DXOS.org
//

import { Flags } from '@oclif/core';
import { existsSync } from 'fs';
import { readFile } from 'fs/promises';

import { DX_DATA, getProfilePath } from '@dxos/client-protocol';
import { log } from '@dxos/log';

import { BaseCommand } from '../../base';

export default class Import extends BaseCommand<typeof Import> {
  static override description = 'Import profile.';
  static override flags = {
    ...BaseCommand.flags,
    file: Flags.string({
      description: 'Archive filename.',
      required: true,
    }),
  };

  async run(): Promise<any> {
    const { profile, file, 'dry-run': dryRun } = this.flags;

    const { createLevel, createStorageObjects, importProfileData, decodeProfileArchive } = await import(
      '@dxos/client-services'
    );

    const storageConfig = this.clientConfig!.get('runtime.client.storage')!;

    const data = await readFile(file);
    const archive = decodeProfileArchive(data);

    log.info('will overwrite profile', { profile });
    log.info('importing archive', { entries: archive.storage.length });

    const dataDir = getProfilePath(DX_DATA, profile);

    if (existsSync(dataDir)) {
      log.error('data directory already exists', { dataDir });
      throw new Error('Data directory already exists');
    }

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
