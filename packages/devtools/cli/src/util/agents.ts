//
// Copyright 2023 DXOS.org
//

import { ux } from '@oclif/core';
import { formatDistance } from 'date-fns';

import { type ProcessInfo } from '@dxos/agent';

import { table, type TableFlags } from './table';

export const printAgents = (daemons: ProcessInfo[], flags: TableFlags = {}) => {
  ux.stdout(
    table(
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
        locked: {
          header: 'locked',
        },
        restarts: {
          header: 'restarts',
        },
        started: {
          header: 'uptime',
          get: (row) => {
            if (!row.running) {
              return 'stopped';
            }
            if (!row.started) {
              return 'Null';
            }
            return formatDistance(new Date(), new Date(row.started));
          },
        },
        logFile: {
          header: 'logFile',
          extended: true,
        },
      },
      flags,
    ),
  );
};
