//
// Copyright 2022 DXOS.org
//

import chalk from 'chalk';

import { latch } from '@dxos/async';
import { Client } from '@dxos/client';

import { BaseCommand } from '../../base-command';

export default class Invite extends BaseCommand {
  static override description = 'Create space invitation.';
  static override args = [
    {
      name: 'key',
      require: true
    }
  ];

  async run (): Promise<any> {
    const { args } = await this.parse(Invite);
    const { key } = args; // TODO(burdon): Prompt.

    return await this.execWithClient(async (client: Client) => {
      const { value: parties = [] } = await client.echo.queryParties();
      const party = parties.find(party => party.key.toHex().startsWith(key));
      if (!party) {
        this.log('Invalid key');
        return;
      }

      const invitation = await party.createInvitation();
      const descriptor = invitation.descriptor.encode();
      const secret = invitation.secret.toString();

      this.log(chalk`{blue Invitation}: ${descriptor}`);
      this.log(chalk`{red Secret}: ${secret}`);

      // TODO(burdon): Async error handling (see kodama).
      const [promise, resolve] = latch();
      invitation.canceled.on(resolve);
      invitation.finished.on(resolve);
      invitation.error.on(err => this.error(err));

      await promise;
    });
  }
}
