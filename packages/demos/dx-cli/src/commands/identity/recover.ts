//
// Copyright 2022 DXOS.org
//

import { Client } from '@dxos/client';

import { BaseCommand } from '../../base-command';

export default class Recover extends BaseCommand {
  static override enableJsonFlag = true;
  static override description = 'Recover profile.';
  static override args = [
    {
      name: 'seedphrase'
    }
  ]

  async run (): Promise<any> {
    const { args } = await this.parse(Recover);
    const { seedphrase } = args; // TODO(burdon): Prompt.

    return await this.execWithClient(async (client: Client) => {
      let profile = client.halo.profile;
      if (profile) {
        this.log('Profile already initialized.');
      } else {
        // TODO(burdon): Needs to be connected to peer?
        this.log('Recovering...', seedphrase);
        profile = await client.halo.recoverProfile(seedphrase);
        const { username } = profile;
        this.log('Profile', profile);
        return { seedphrase, username };
      }
    });
  }
}
