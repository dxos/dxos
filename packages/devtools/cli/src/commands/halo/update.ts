//
// Copyright 2022 DXOS.org
//

import { Flags } from '@oclif/core';
import chalk from 'chalk';

import { asyncTimeout } from '@dxos/async';
import { IdentityWaitTimeoutError, IDENTITY_WAIT_TIMEOUT } from '@dxos/cli-base';

import { BaseCommand } from '../../base';

export default class Update extends BaseCommand<typeof Update> {
  static override description = 'Update identity profile.';
  static override flags = {
    ...BaseCommand.flags,
    displayName: Flags.string({ description: 'Set display name' }),
  };

  async run(): Promise<any> {
    return await this.execWithClient(async ({ client }) => {
      // TODO(mykola): Hack to wait for identity with `client.halo.identity.wait()`.
      await asyncTimeout(client.spaces.waitUntilReady(), IDENTITY_WAIT_TIMEOUT, new IdentityWaitTimeoutError());
      const identity = client.halo.identity.get();

      if (!identity) {
        // TODO(burdon): Error if called twice with no halo.
        this.log(chalk`{red Identity not initialized.}`);
        return {};
      }

      this.log('updating:');

      const newIdentity = await client.services.services.IdentityService?.updateProfile({
        displayName: this.flags.displayName,
      });
      this.log('Identity updated:', newIdentity);

      return newIdentity;
    });
  }
}
