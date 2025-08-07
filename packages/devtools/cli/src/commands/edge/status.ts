//
// Copyright 2024 DXOS.org
//

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
        const edgeStatus = await client.edge.getStatus();

        // Output JSON directly so we can control the exit code.
        if (this.jsonEnabled()) {
          console.log(JSON.stringify({ edgeStatus }));
        } else {
          this.log('edge status', { edgeStatus });
        }
      },
      { halo: true },
    );
  }
}
