//
// Copyright 2023 DXOS.org
//

import { BaseCommand } from '../../base-command';

export default class List extends BaseCommand {
  static override enableJsonFlag = true;
  static override description = 'List daemons currently running.';

  async run(): Promise<any> {
    return await this.execWithDaemon(async (daemon) => {
      const result = await daemon.list();
      this.log('Daemons:', result);
      return result;
    });
  }
}
