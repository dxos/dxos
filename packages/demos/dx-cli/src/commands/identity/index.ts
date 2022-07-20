//
// Copyright 2022 DXOS.org
//

import { Client } from '@dxos/client';

import { BaseCommand } from '../../base-command';

export default class Identity extends BaseCommand {
  static description = 'Show profile.';
  // static aliases = ['id']; // TODO(burdon): Doesn't propagate to child commands.
  static flags = {}; // Required.

  async run (): Promise<void> {
    await this.execWithClient(async (client: Client) => {
      const profile = client.halo.profile;

      // TODO(burdon): Prompt.
      if (!profile) {
        this.log('Profile not initialized.');
      }
    });
  }
}
