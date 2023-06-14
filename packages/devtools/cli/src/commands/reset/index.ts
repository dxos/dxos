//
// Copyright 2022 DXOS.org
//

import { Flags, ux } from '@oclif/core';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';

import { DX_CACHE, DX_DATA, DX_RUNTIME, DX_STATE } from '@dxos/client-protocol';

import { BaseCommand } from '../../base-command';

export default class Reset extends BaseCommand {
  static override description = 'Reset user data.';
  static override flags = {
    ...BaseCommand.flags,
    force: Flags.boolean({
      description: 'Force delete.',
    }),
  };

  async run(): Promise<any> {
    const params = await this.parse(Reset);
    const {
      flags: { force, profile },
    } = params;

    console.log('::::::::::::', profile);

    const paths = [
      path.join(DX_CACHE, profile),
      path.join(DX_DATA, profile),
      path.join(DX_STATE, profile),
      path.join(DX_RUNTIME, profile),
      this.clientConfig?.get('runtime.client.storage.path'), // TODO(burdon): Should match DX_RUNTIME.
    ].filter(Boolean) as string[];

    const go = force || (await ux.confirm(chalk`\n{red Delete all data? {white (Profile: ${profile})}}`));
    if (!go) {
      this.warn('Deleting files...');
      paths.forEach((path) => {
        fs.rmSync(path, { recursive: true, force: true });
        this.ok();
      });

      // TODO(burdon): Daemon life-cycle.
      await this.execWithDaemon(async (daemon) => daemon.restart(params.flags.profile));
    }

    return paths;
  }
}
