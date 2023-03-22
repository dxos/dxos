//
// Copyright 2022 DXOS.org
//

import { Args } from '@oclif/core';

import { Client } from '@dxos/client';

import { BaseCommand } from '../../base-command';

export default class Create extends BaseCommand {
  static override enableJsonFlag = true;
  static override description = 'Create HALO.';
  static override args = {
    displayName: Args.string({ description: 'Display name' })
  };

  async run(): Promise<any> {
    const { args } = await this.parse(Create);
    const { displayName } = args; // TODO(burdon): Prompt.

    return await this.execWithClient(async (client: Client) => {
      let profile = client.halo.identity;
      if (profile) {
        this.log('Identity already initialized.'); // TODO(burdon): Return as error?
      } else {
        profile = await client.halo.createIdentity({ displayName });
        return { displayName };
      }
    });
  }
}
