//
// Copyright 2022 DXOS.org
//

import { Flags } from '@oclif/core';
import chalk from 'chalk';
import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import { prompt } from 'inquirer';
import { resolve } from 'path';

import { log } from '@dxos/log';
import type { Runtime } from '@dxos/protocols/proto/dxos/config';

import { BaseCommand } from '../../base';

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
      this.log('will overwrite profile', { profile });
      const { confirm } = await prompt({
        type: 'confirm',
        name: 'confirm',
        default: false,
        message: chalk`{red Delete all data? {white (Profile: ${profile})}}`,
      });
      if (!confirm) {
        return;
      }
      storageConfig = this.clientConfig!.get('runtime.client.storage')!;
    } else {
      const fullPath = resolve(storageDir);
      this.log('importing into', { path: fullPath });
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
    this.log('importing archive', { entries: archive.storage.length });

    if (dryRun) {
      return;
    }

    const { storage } = createStorageObjects(storageConfig);
    const level = await createLevel(storageConfig);

    this.log('begin profile import', { storageConfig });
    await importProfileData({ storage, level }, archive);
    this.log('done profile import');
  }
}
