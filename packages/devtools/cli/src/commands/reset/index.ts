//
// Copyright 2022 DXOS.org
//

import { Flags } from '@oclif/core';
import fs from 'fs';

import { BaseCommand } from '../../base-command';

export default class Reset extends BaseCommand {
  static override description = 'Reset all data.';

  static override flags = {
    ...BaseCommand.flags,
    profile: Flags.string({
      description: 'Profile name.',
      env: 'DX_PROFILE',
    }),
  };

  async run(): Promise<any> {
    const params = await this.parse(Reset);
    // TODO(burdon): Warning prompt.
    const path = this.clientConfig?.get('runtime.client.storage.path');
    if (path) {
      fs.rmSync(path, { recursive: true, force: true });
      this.ok();
    }

    await this.execWithDaemon(async (daemon) => daemon.restart(params.flags.profile));

    this.log('Reset finished');
  }
}
