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
      flags: { dryRun, force, profile },
    } = params;

    const paths = [
      path.join(DX_CACHE, profile),
      path.join(DX_DATA, profile),
      path.join(DX_STATE, profile),
      path.join(DX_RUNTIME, profile),
      this.clientConfig?.get('runtime.client.storage.path'), // TODO(burdon): Should match DX_RUNTIME.
    ].filter(Boolean) as string[];

    const dry = dryRun || !(force || (await ux.confirm(chalk`\n{red Delete all data? {white (Profile: ${profile})}}`)));
    if (!dry) {
      await this.execWithDaemon(async (daemon) => daemon.stop(params.flags.profile));

      this.warn('Deleting files...');
      paths.forEach((path) => {
        fs.rmSync(path, { recursive: true, force: true });
        this.ok();
      });

      await this.execWithDaemon(async (daemon) => daemon.restart(params.flags.profile));
    }

    return paths;
  }
}
