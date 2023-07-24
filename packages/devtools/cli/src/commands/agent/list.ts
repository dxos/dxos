//
// Copyright 2023 DXOS.org
//

import { ux } from '@oclif/core';
import { formatDistance } from 'date-fns';

import { BaseCommand } from '../../base-command';

export const printAgents = (daemons: any[], flags = {}) => {
  ux.table(
    daemons,
    {
      profile: {
        header: 'profile',
      },
      pid: {
        header: 'process',
      },
      running: {
        header: 'running',
      },
      restarts: {
        header: 'restarts',
      },
      uptime: {
        header: 'uptime',
        get: (row) => formatDistance(new Date(), new Date(row.started)),
      },
      logFile: {
        header: 'logFile',
      },
    },
    {
      ...flags,
    },
  );
};

export default class List extends BaseCommand<typeof List> {
  static override enableJsonFlag = true;
  static override description = 'List agents.';

  async run(): Promise<any> {
    return await this.execWithDaemon(async (daemon) => {
      const result = await daemon.list();
      printAgents(result);
      return result;
    });
  }
}
