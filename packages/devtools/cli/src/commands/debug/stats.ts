//
// Copyright 2022 DXOS.org
//

import { Flags } from '@oclif/core';
import rev from 'git-rev-sync';
import defaultsDeep from 'lodash.defaultsDeep';

import { asyncTimeout } from '@dxos/async';
import { Client } from '@dxos/client';

import { BaseCommand } from '../../base-command';

/**
 * DX_PROFILE=test dx debug stats --json
 */
export default class Stats extends BaseCommand<typeof Stats> {
  static override enableJsonFlag = true;
  static override description = 'Output debug stats.';
  static override flags = {
    ...BaseCommand.flags,
    humanize: Flags.boolean({
      description: 'Humanized keys.',
    }),
    truncate: Flags.boolean({
      description: 'Truncate keys.',
    }),
    verbose: Flags.boolean({
      description: 'Verbose output.',
    }),
  };

  async run(): Promise<any> {
    return await this.execWithClient(async (client: Client) => {
      const data = await asyncTimeout(
        client.diagnostics({ humanize: this.flags.humanize, truncate: this.flags.truncate }),
        5_000,
      );

      return defaultsDeep({}, data, {
        client: {
          config: {
            runtime: {
              app: {
                build: {
                  timestamp: rev.date().toISOString(),
                  hash: rev.long(),
                  branch: rev.branch(),
                },
              },
            },
          },
        },
      });
    });
  }
}
