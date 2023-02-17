//
// Copyright 2023 DXOS.org
//

import { CliUx } from '@oclif/core';
import chalk from 'chalk';

import { Trigger, sleep } from '@dxos/async';
import { Client, Invitation, InvitationEncoder } from '@dxos/client';

import { BaseCommand } from '../../base-command';

export default class Share extends BaseCommand {
  static override enableJsonFlag = true;
  static override description = 'Create HALO (device) invitation.';

  async run(): Promise<any> {
    return await this.execWithClient(async (client: Client) => {
      const profile = client.halo.profile;
      if (!profile) {
        this.log(chalk`{red Profile not initialized.}`);
        return {};
      } else {
        const observable = await client.halo.createInvitation();

        const connecting = new Trigger<Invitation>();
        const done = new Trigger<Invitation>();

        observable.subscribe({
          onConnecting: (invitation) => {
            connecting.wake(invitation);
          },
          onSuccess: (invitation) => {
            done.wake(invitation);
          },
          onError: (err) => {
            throw err;
          }
        });

        await connecting.wait();

        const invitationCode = InvitationEncoder.encode(observable.invitation!);

        this.log(chalk`\n{blue Invitation}: ${invitationCode}`);
        this.log(chalk`\n{red Secret}: ${observable.invitation!.authenticationCode}\n`);

        CliUx.ux.action.start('Waiting for peer to connect');
        await done.wait();
        CliUx.ux.action.stop();

        // TODO(egorgripasov): Wait to replicate?
        await sleep(15_000);
      }
    });
  }
}
