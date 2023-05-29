//
// Copyright 2023 DXOS.org
//

import { BaseCommand } from '../../base-command';

export default class Restart extends BaseCommand {
  static override enableJsonFlag = true;
  static override description = 'Restart daemon process.';

  async run(): Promise<any> {
    return await this.execWithDaemon(async (daemon) => {
      const params = await this.parse(Restart);
      const process = await daemon.restart(params.flags.profile);
      this.log('Restarted: ', process);
    });
  }
}
