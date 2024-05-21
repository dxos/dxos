//
// Copyright 2024 DXOS.org
//

import { Flags } from '@oclif/core';

import type { Client } from '@dxos/client';
import { SystemStatus } from '@dxos/protocols/proto/dxos/client/services';

import { BaseCommand } from '../../base';

export default class Status extends BaseCommand<typeof Status> {
  static override enableJsonFlag = true;
  static override description = 'Show agent status';

  static override flags = {
    ...BaseCommand.flags,
    // TODO(nf): pass as flag to execWithClient instead of setting default flag.
    'no-start-agent': Flags.boolean({
      description: 'Do not automatically start an agent if one is not running.',
      default: true,
    }),
  };

  async run(): Promise<any> {
    return await this.execWithClient(async (client: Client) => {
      const status = client.status.get();
      const statusString = status !== null ? SystemStatus[status] : 'UNKNOWN';
      // TODO(nf): also show how we connected (or if we're in host mode?)

      // Output JSON directly so we can control the exit code.
      if (this.jsonEnabled()) {
        console.log(JSON.stringify({ SystemStatus: statusString }));
      } else {
        this.log(`System status: ${statusString}`);
      }
      if (status !== SystemStatus.ACTIVE) {
        process.exit(1);
      }
    });
  }
}
