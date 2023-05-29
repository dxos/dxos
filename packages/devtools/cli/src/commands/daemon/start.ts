//
// Copyright 2023 DXOS.org
//

import { BaseCommand } from '../../base-command';

export default class Start extends BaseCommand {
  static override enableJsonFlag = true;
  static override description = 'Start daemon process.';

  async run(): Promise<any> {
    return await this.execWithDaemon(async (daemon) => {
      const params = await this.parse(Start);
      const process = await daemon.start(params.flags.profile);
      this.log('Started:', process);
    });
  }
}
