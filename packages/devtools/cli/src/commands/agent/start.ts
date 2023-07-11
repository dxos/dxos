//
// Copyright 2023 DXOS.org
//

import chalk from 'chalk';

import { BaseCommand } from '../../base-command';

export default class Start extends BaseCommand<typeof Start> {
  static override enableJsonFlag = true;
  static override description = 'Start agent daemon.';

  async run(): Promise<any> {
    return await this.execWithDaemon(async (daemon) => {
      const { flags } = await this.parse(Start);
      if (await daemon.isRunning(flags.profile)) {
        this.log(chalk`{red Warning}: ${flags.profile} is already running (Maybe run 'dx reset')`);
      }
      await daemon.start(this.flags.profile);
      this.log('Agent started');
    });
  }
}
