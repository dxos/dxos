//
// Copyright 2022 DXOS.org
//

import fs from 'fs';

import { BaseCommand } from '../../base-command';

export default class Reset extends BaseCommand {
  static override description = 'Reset user data.';

  async run(): Promise<any> {
    const params = await this.parse(Reset);
    // TODO(burdon): Warning prompt.
    const path = this.clientConfig?.get('runtime.client.storage.path');
    if (path) {
      fs.rmSync(path, { recursive: true, force: true });
      this.ok();
    }

    await this.execWithDaemon(async (daemon) => daemon.stop(params.flags.profile));

    this.log('Reset finished');
  }
}
