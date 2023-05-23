//
// Copyright 2023 DXOS.org
//

import { Flags } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class Start extends BaseCommand {
  static override enableJsonFlag = true;
  static override description = 'Start daemon process.';

  static override flags = {
    ...BaseCommand.flags,
    profile: Flags.string({
      description: 'Profile name.',
      default: 'default',
      env: 'DX_PROFILE',
    }),
  };

  async run(): Promise<any> {
    return await this.execWithDaemon(async (daemon) => {
      const params = await this.parse(Start);
      const proc = await daemon.start(params.flags.profile);
      if (proc.length === 0) {
        throw new Error('Daemon is not started');
      }
      this.log('Started:', { id: proc[0].pm_id, name: proc[0].name });
    });
  }
}
