//
// Copyright 2022 DXOS.org
//

import chalk from 'chalk';

import { Client } from '@dxos/client';

import { BaseCommand } from '../../base-command';

export default class Halo extends BaseCommand {
  static override enableJsonFlag = true;
  static override description = 'Show HALO profile.';

  async run (): Promise<any> {
    return await this.execWithClient(async (client: Client) => {
      const profile = client.halo.profile;
      if (!profile) {
        // TODO(burdon): Error if called twice with no halo.
        //  Error [OpenError]: Error parsing JSON in /tmp/user-1/dx/cli/keystore/data.json: Unexpected end of JSON input
        this.log(chalk`{red Profile not initialized.}`);
        return {};
      } else {
        const { username, publicKey } = profile;
        this.log(`Username: ${username}`);
        return {
          username,
          publicKey: publicKey.toHex()
        };
      }
    });
  }
}
