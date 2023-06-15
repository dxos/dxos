//
// Copyright 2023 DXOS.org
//

import { BaseCommand } from '../../base-command';

export default class Stop extends BaseCommand {
  static override enableJsonFlag = true;
  static override description = 'Stop agent daemon.';

  async run(): Promise<any> {
    return await this.execWithDaemon(async (daemon) => {
      const params = await this.parse(Stop);
      await daemon.stop(params.flags.profile);

      this.log('Stopped');
    });
  }
}
