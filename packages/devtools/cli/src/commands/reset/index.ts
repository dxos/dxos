//
// Copyright 2022 DXOS.org
//

import { Flags, ux } from '@oclif/core';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';

import { DX_CACHE, DX_DATA, DX_RUNTIME, DX_STATE } from '@dxos/client-protocol';

import { BaseCommand } from '../../base-command';

export default class Reset extends BaseCommand<typeof Reset> {
  static override description = 'Reset user data.';
  static override flags = {
    ...BaseCommand.flags,
    force: Flags.boolean({
      description: 'Force delete.',
    }),
  };

  async run(): Promise<any> {
    const profile = this.flags.profile;

    const paths = [
      path.join(DX_CACHE, profile),
      path.join(DX_DATA, profile),
      path.join(DX_STATE, profile),
      path.join(DX_RUNTIME, profile),
      this.clientConfig?.get('runtime.client.storage.path'),
    ].filter(Boolean) as string[];

    const dry =
      this.flags['dry-run'] ||
      !(this.flags.force || (await ux.confirm(chalk`\n{red Delete all data? {white (Profile: ${profile})}}`)));
    if (!dry) {
      // TODO(burdon): Problem if running manually.
      await this.execWithDaemon(async (daemon) => daemon.stop(this.flags.profile));

      this.warn('Deleting files...');
      paths.forEach((path) => {
        fs.rmSync(path, { recursive: true, force: true });
      });

      await this.maybeStartDaemon();
    }

    return paths;
  }
}
