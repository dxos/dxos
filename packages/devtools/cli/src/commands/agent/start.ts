//
// Copyright 2023 DXOS.org
//

import { BaseCommand } from '../../base-command';

export default class Start extends BaseCommand<typeof Start> {
  static override enableJsonFlag = true;
  static override description = 'Start agent daemon.';

  async run(): Promise<any> {
    return await this.execWithDaemon(async (daemon) => {
      await daemon.start(this.flags.profile);
      this.log('Agent started');
    });
  }
}
