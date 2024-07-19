//
// Copyright 2024 DXOS.org
//

import { SystemStatus } from '@dxos/protocols/proto/dxos/client/services';

import { BaseCommand } from '../../base';

export default class Status extends BaseCommand<typeof Status> {
  static override enableJsonFlag = true;
  static override description = 'Show agent status';

  static override flags = {
    ...BaseCommand.flags,
  };

  async run(): Promise<any> {
    return await this.execWithClient(
      async ({ client }) => {
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
      },
      { halo: false },
    );
  }
}
