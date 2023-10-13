//
// Copyright 2022 DXOS.org
//

import { Args } from '@oclif/core';

import { type Client } from '@dxos/client';

import { BaseCommand } from '../../base-command';

export default class Create extends BaseCommand<typeof Create> {
  static override enableJsonFlag = true;
  static override description = 'Create HALO.';
  static override args = {
    displayName: Args.string({ description: 'Display name', required: true }),
  };

  async run(): Promise<any> {
    const { displayName } = this.args;

    return await this.execWithClient(async (client: Client) => {
      let identity = client.halo.identity.get();
      if (identity) {
        this.log('Identity already initialized.');
      } else {
        identity = await client.halo.createIdentity({ displayName });
        return { identityKey: identity.identityKey.toHex(), displayName };
      }
    });
  }
}
