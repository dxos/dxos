//
// Copyright 2022 DXOS.org
//

import { Flags } from '@oclif/core';
import rev from 'git-rev-sync';

import { asyncTimeout } from '@dxos/async';
import { Client, PublicKey } from '@dxos/client';
import { diagnostics } from '@dxos/client/diagnostics';
import { SubscribeToFeedsResponse } from '@dxos/protocols/proto/dxos/devtools/host';

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
        diagnostics(client, { humanize: this.flags.humanize, truncate: this.flags.truncate }),
        5_000,
      );

      return {
        timestamp: new Date().toISOString(),
        cli: {
          version: this.config.version,
          branch: rev.branch(),
          hash: rev.long(),
          commit: rev.date().toISOString(),
        },
        diagnostics: data,
      };
    });
  }
}
