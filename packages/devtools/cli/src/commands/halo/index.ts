//
// Copyright 2022 DXOS.org
//

import chalk from 'chalk';

import { Client } from '@dxos/client';

import { BaseCommand } from '../../base-command';

export default class Halo extends BaseCommand {
  static override enableJsonFlag = true;
  static override description = 'Show HALO profile.';

  async run(): Promise<any> {
    return await this.execWithClient(async (client: Client) => {
      const identity = client.halo.identity.get();
      if (!identity) {
        // TODO(burdon): Error if called twice with no halo.
        this.log(chalk`{red Identity not initialized.}`);
        return {};
      } else {
        const { identityKey, profile } = identity;
        this.log(`Display name: ${profile?.displayName}`);
        return {
          identityKey: identityKey.toHex(),
          profile,
        };
      }
    });
  }
}
