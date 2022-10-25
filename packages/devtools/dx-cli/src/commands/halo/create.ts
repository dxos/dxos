//
// Copyright 2022 DXOS.org
//

import { Client, generateSeedPhrase } from '@dxos/client';

import { BaseCommand } from '../../base-command';

export default class Create extends BaseCommand {
  static override enableJsonFlag = true;
  static override description = 'Create HALO.';
  static override args = [
    {
      name: 'username'
    }
  ];

  async run(): Promise<any> {
    const { args } = await this.parse(Create);
    const { username } = args; // TODO(burdon): Prompt.

    return await this.execWithClient(async (client: Client) => {
      let profile = client.halo.profile;
      if (profile) {
        this.log('Profile already initialized.'); // TODO(burdon): Return as error?
      } else {
        const seedphrase = generateSeedPhrase();
        profile = await client.halo.createProfile({ seedphrase, username });
        this.log(
          `IMPORTANT: Record your recover seed phrase:\n[${seedphrase}]`
        );
        return { seedphrase, username: profile.username };
      }
    });
  }
}
