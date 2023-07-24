//
// Copyright 2023 DXOS.org
//

import { BaseCommand } from '../../base-command';

export default class Restart extends BaseCommand<typeof Restart> {
  static override enableJsonFlag = true;
  static override description = 'Restart agent daemon.';

  async run(): Promise<any> {
    return await this.execWithDaemon(async (daemon) => {
      const process = await daemon.restart(this.flags.profile, { config: this.flags.config });
      this.log('Restarted: ', process);
    });
  }
}
