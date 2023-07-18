//
// Copyright 2023 DXOS.org
//

import { Flags } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class Stop extends BaseCommand<typeof Stop> {
  static override enableJsonFlag = true;
  static override description = 'Stop agent daemon.';

  static override flags = {
    ...BaseCommand.flags,
    all: Flags.boolean({ char: 'a', description: 'Stop all agents.' }),
  };

  async run(): Promise<any> {
    return await this.execWithDaemon(async (daemon) => {
      if (this.flags.all) {
        const processes = await daemon.list();
        await Promise.all(
          processes.map(async ({ profile }) => {
            await daemon.stop(profile!, { force: true });
            this.log(`Agent stopped: ${profile}`);
          }),
        );
      } else {
        await daemon.stop(this.flags.profile);
        this.log('Agent stopped');
      }
    });
  }
}
