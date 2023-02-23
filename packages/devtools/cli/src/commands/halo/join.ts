//
// Copyright 2023 DXOS.org
//

import { CliUx, Flags } from '@oclif/core';
import chalk from 'chalk';

import { Trigger, sleep } from '@dxos/async';
import { Client, Invitation, InvitationEncoder } from '@dxos/client';

import { BaseCommand } from '../../base-command';

export default class Join extends BaseCommand {
  static override enableJsonFlag = true;
  static override description = 'Join HALO (device) invitation.';

  static override flags = {
    ...BaseCommand.flags,
    invitation: Flags.string({
      description: 'Invitation code'
    })
  };

  async run(): Promise<any> {
    const { flags } = await this.parse(Join);
    let { invitation: encoded } = flags;

    return await this.execWithClient(async (client: Client) => {
      const identity = client.halo.identity;
      if (identity) {
        this.log(chalk`{red Profile already initialized.}`);
        return {};
      } else {
        if (!encoded) {
          encoded = await CliUx.ux.prompt('Invitation');
        }

        const invitation = InvitationEncoder.decode(encoded!);
        const observable = await client.halo.acceptInvitation(invitation);

        const connecting = new Trigger<Invitation>();
        const done = new Trigger<Invitation>();

        observable.subscribe({
          onConnecting: (invitation) => {
            connecting.wake(invitation);
          },
          async onAuthenticating() {
            const code = await CliUx.ux.prompt('Invitation code');
            await observable.authenticate(code);
          },
          onSuccess: (invitation) => {
            done.wake(invitation);
          },
          onError: (err) => {
            throw err;
          }
        });

        CliUx.ux.action.start('Waiting for peer to connect');
        await connecting.wait();
        CliUx.ux.action.stop();

        await done.wait();

        // TODO(egorgripasov): Wait to replicate?
        await sleep(15_000);
      }
    });
  }
}
