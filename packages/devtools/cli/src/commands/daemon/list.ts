//
// Copyright 2023 DXOS.org
//

import { ux } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export const printDaemons = (daemons: any[], flags = {}) => {
  ux.table(
    daemons,
    {
      profile: {
        header: 'Profile',
      },
      pid: {
        header: 'Process',
      },
      isRunning: {
        header: 'Running',
      },
    },
    {
      ...flags,
    },
  );
};

export default class List extends BaseCommand {
  static override enableJsonFlag = true;
  static override description = 'List daemons.';

  async run(): Promise<any> {
    return await this.execWithDaemon(async (daemon) => {
      const result = await daemon.list();
      printDaemons(result);
      return result;
    });
  }
}
