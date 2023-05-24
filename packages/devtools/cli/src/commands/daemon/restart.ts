//
// Copyright 2023 DXOS.org
//

import { Flags } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class Restart extends BaseCommand {
  static override enableJsonFlag = true;
  static override description = 'Restart daemon process.';

  static override flags = {
    ...BaseCommand.flags,
    profile: Flags.string({
      description: 'Profile name.',
      env: 'DX_PROFILE',
    }),
  };

  async run(): Promise<any> {
    return await this.execWithDaemon(async (daemon) => {
      const params = await this.parse(Restart);
      await daemon.restart(params.flags.profile);
      this.log('Restarted');
    });
  }
}
