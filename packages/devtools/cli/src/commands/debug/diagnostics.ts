//
// Copyright 2022 DXOS.org
//

import { Flags } from '@oclif/core';
import rev from 'git-rev-sync';
import defaultsDeep from 'lodash.defaultsdeep';

import { asyncTimeout } from '@dxos/async';
import { Client } from '@dxos/client';

import { BaseCommand } from '../../base-command';

/**
 * DX_PROFILE=test dx debug diagnostics --json
 */
export default class Diagnostics extends BaseCommand<typeof Diagnostics> {
  static override enableJsonFlag = true;
  static override description = 'Output debug diagnostics.';
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
      // TOOD(burdon): asyncTimeout doesn't return.
      // const data = await asyncTimeout(async () => {
      //   const data = await client.diagnostics({ humanize: this.flags.humanize, truncate: this.flags.truncate });
      //   console.log('>>>', data);
      //   return data;
      // }, this.flags.timeout);

      const data = await client.diagnostics({ humanize: this.flags.humanize, truncate: this.flags.truncate });

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
