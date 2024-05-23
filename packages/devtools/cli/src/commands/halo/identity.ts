//
// Copyright 2022 DXOS.org
//

import chalk from 'chalk';

import { type Client } from '@dxos/client';

import { BaseCommand } from '../../base';

export default class Identity extends BaseCommand<typeof Identity> {
  static override enableJsonFlag = true;
  static override description = 'Show HALO identity.';

  async run(): Promise<any> {
    return await this.execWithClient(async (client: Client) => {
      const identity = client.halo.identity.get();
      if (!identity) {
        // TODO(burdon): Error if called twice with no halo.
        this.log(chalk`{red Identity not initialized.}`);
        return {};
      } else {
        await client.spaces.isReady.wait();
        const { identityKey, profile } = identity;
        this.log('Identity key:', identityKey.toHex());
        this.log('Display name:', profile?.displayName);
        return {
          identityKey: identityKey.toHex(),
          profile,
        };
      }
    });
  }
}
