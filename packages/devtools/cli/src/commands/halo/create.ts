//
// Copyright 2022 DXOS.org
//

import { Client } from '@dxos/client';

import { BaseCommand } from '../../base-command';

export default class Create extends BaseCommand {
  static override enableJsonFlag = true;
  static override description = 'Create HALO.';
  static override args = [
    {
      name: 'displayName'
    }
  ];

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
