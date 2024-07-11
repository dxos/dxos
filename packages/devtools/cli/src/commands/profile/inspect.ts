//
// Copyright 2022 DXOS.org
//

import { Flags } from '@oclif/core';
import { readFile } from 'fs/promises';

import { ProfileArchiveEntryType } from '@dxos/protocols';
import { arrayToBuffer } from '@dxos/util';

import { BaseCommand } from '../../base';

export default class Inspect extends BaseCommand<typeof Inspect> {
  static override description = 'Import profile.';
  static override flags = {
    ...BaseCommand.flags,
    file: Flags.string({
      description: 'Archive filename.',
      required: true,
    }),
    storage: Flags.boolean({
      description: 'List storage entries.',
      default: false,
    }),
  };

  async run(): Promise<any> {
    const { file, storage } = this.flags;

    const { decodeProfileArchive } = await import('@dxos/client-services');

    const data = await readFile(file);
    const archive = decodeProfileArchive(data);

    console.log(archive.meta);

    if (storage) {
      console.log('\nStorage entires:\n');
      for (const entry of archive.storage) {
        const key =
          typeof entry.key === 'string' ? entry.key : JSON.stringify(arrayToBuffer(entry.key).toString()).slice(1, -1);

        console.log(`  ${ProfileArchiveEntryType[entry.type]} ${key}`);
      }
    }
  }
}
