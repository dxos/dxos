//
// Copyright 2022 DXOS.org
//

import { CliUx } from '@oclif/core';
import chalk from 'chalk';

import { latch } from '@dxos/async';
import { Client } from '@dxos/client';

import { BaseCommand } from '../../base-command';
import { printMembers, selectSpace } from '../../util';

// TODO(burdon): Reconcile invite/share.
export default class Invite extends BaseCommand {
  static override description = 'Create space invitation.';
  static override args = [
    {
      name: 'key'
    }
  ];

  async run (): Promise<any> {
    const { args, flags } = await this.parse(Invite);
    let { key } = args;
    const { timeout } = flags;

    return await this.execWithClient(async (client: Client) => {
      const { value: parties = [] } = await client.echo.queryParties();
      if (!key) {
        key = await selectSpace(parties);
      }

      const party = parties.find(party => party.key.toHex().startsWith(key));
      if (!party) {
        this.log('Invalid key');
        return;
      }

      const invitation = await party.createInvitation();
      const descriptor = invitation.descriptor.encode();
      const secret = invitation.secret.toString();

      this.log(chalk`\n{blue Invitation}: ${descriptor}`);
      this.log(chalk`\n{red Secret}: ${secret}\n`);

      const [promise, resolve, reject] = latch({ timeout: timeout * 1_000 });

      // TODO(burdon): Async error handling (see kodama).
      invitation.canceled.on(resolve);
      invitation.finished.on(resolve);
      invitation.error.on(reject);

      try {
        CliUx.ux.action.start('Waiting for peer to connect');
        await promise;
        CliUx.ux.action.stop();

        const { value: members } = party.queryMembers();
        printMembers(members);
      } catch (err: any) {
        invitation.cancel();
        CliUx.ux.action.stop(String(err));
      }
    });
  }
}
