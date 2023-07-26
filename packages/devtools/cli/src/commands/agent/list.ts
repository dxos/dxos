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
      lockAcquired: {
        header: 'lockAcquired',
      },
      restarts: {
        header: 'restarts',
      },
      uptime: {
        header: 'uptime',
        get: (row) => {
          if (!row.running) {
            return 'stopped';
          }
          return formatDistance(new Date(), new Date(row.started));
        },
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
      if (!this.flags.json) {
        printAgents(result);
      }
      return result;
    });
  }
}
