//
// Copyright 2023 DXOS.org
//

import { ux, Flags } from '@oclif/core';
import chalk from 'chalk';

import { Trigger } from '@dxos/async';
import { Client, Invitation, InvitationEncoder } from '@dxos/client';

import { BaseCommand } from '../../base-command';

export default class Join extends BaseCommand {
  static override enableJsonFlag = true;
  static override description = 'Join HALO (device) invitation.';

  static override flags = {
    ...BaseCommand.flags,
    invitation: Flags.string({
      description: 'Invitation code',
    }),
  };

  async run(): Promise<any> {
    const { flags } = await this.parse(Join);
    let { invitation: encoded } = flags;

    return await this.execWithClient(async (client: Client) => {
      const identity = client.halo.identity.get();
      if (identity) {
        this.log(chalk`{red Profile already initialized.}`);
        return {};
      } else {
        if (!encoded) {
          encoded = await ux.prompt('Invitation');
        }

        if (encoded.startsWith('http')) {
          const searchParams = new URLSearchParams(encoded.substring(encoded.lastIndexOf('?')));
          encoded = searchParams.get('haloInvitationCode') ?? encoded;
        }
        const invitation = InvitationEncoder.decode(encoded!);
        const observable = client.halo.acceptInvitation(invitation);

        const connecting = new Trigger<Invitation>();
        const done = new Trigger<Invitation>();
        observable.subscribe(
          async (invitation) => {
            switch (invitation.state) {
              case Invitation.State.CONNECTING: {
                connecting.wake(invitation);
                break;
              }

              case Invitation.State.READY_FOR_AUTHENTICATION: {
                const code = invitation.authCode ?? (await ux.prompt('Invitation code'));
                await observable.authenticate(code);
                break;
              }

              case Invitation.State.SUCCESS: {
                done.wake(invitation);
                break;
              }
            }
          },
          (err) => {
            throw err;
          },
        );

        ux.action.start('Waiting for peer to connect');
        await connecting.wait();
        ux.action.stop();

        ux.action.start('Waiting for peer to finish invitation');
        await done.wait();
        ux.action.stop();
      }
    });
  }
}
