//
// Copyright 2023 DXOS.org
//

import { BaseCommand } from '../../base-command';

export default class Stop extends BaseCommand<typeof Stop> {
  static override enableJsonFlag = true;
  static override description = 'Stop agent daemon.';

  async run(): Promise<any> {
    return await this.execWithDaemon(async (daemon) => {
      await daemon.stop(this.flags.profile);
      this.log('Agent stopped');
    });
  }
}
