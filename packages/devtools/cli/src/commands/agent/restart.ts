//
// Copyright 2023 DXOS.org
//

import { Flags } from '@oclif/core';

import { BaseCommand } from '../../base';

export default class Restart extends BaseCommand<typeof Restart> {
  static override enableJsonFlag = true;
  static override description = 'Restart agent daemon.';

  static override flags = {
    ...BaseCommand.flags,
    force: Flags.boolean({ description: 'Force restart.' }),
    system: Flags.boolean({
      description: 'Run as system daemon.',
      default: false,
    }),
  };

  async run(): Promise<any> {
    return await this.execWithDaemon(async (daemon) => {
      const process = await daemon.restart(this.flags.profile, { config: this.flags.config });
      if (process && this.flags.verbose) {
        this.log('Restarted:', process);
      }
    }, this.flags.system);
  }
}
