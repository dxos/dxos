//
// Copyright 2022 DXOS.org
//

import { Flags } from '@oclif/core';

import { Client, diagnostics } from '@dxos/client';

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
  };

  async run(): Promise<any> {
    return await this.execWithClient(async (client: Client) => {
      return diagnostics(client, { humanize: this.flags.humanize, truncate: this.flags.truncate });
    });
  }
}
