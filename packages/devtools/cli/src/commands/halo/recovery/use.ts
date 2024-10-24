//
// Copyright 2022 DXOS.org
//

import { Flags } from '@oclif/core';

import { BaseCommand } from '../../../base';

export default class Use extends BaseCommand<typeof Use> {
  static override enableJsonFlag = true;
  static override description = 'Use a seedphrase to recover identity.';

  static override flags = {
    ...BaseCommand.flags,
    seedphrase: Flags.string({ description: 'Seedphrase.', required: true }),
  };

  async run(): Promise<any> {
    const { seedphrase } = this.flags;

    return await this.execWithClient(
      async ({ client }) => {
        const identity = await client.services.services.IdentityService!.recoverIdentity({ seedphrase });
        return { identityKey: identity.identityKey.toHex() };
      },
      { halo: false },
    );
  }
}
