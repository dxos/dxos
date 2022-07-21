//
// Copyright 2022 DXOS.org
//

import chalk from 'chalk';

import { Client } from '@dxos/client';

import { BaseCommand } from '../../base-command';

export default class Identity extends BaseCommand {
  static override description = 'Show profile.';
  // static override aliases = ['id']; // TODO(burdon): Doesn't propagate to child commands.

  async run (): Promise<void> {
    await this.execWithClient(async (client: Client) => {
      const profile = client.halo.profile;
      if (!profile) {
        this.log(chalk`{red Profile not initialized.}`);
      }
    });
  }
}
