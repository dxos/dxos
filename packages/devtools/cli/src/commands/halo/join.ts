//
// Copyright 2023 DXOS.org
//

import { ux, Flags } from '@oclif/core';
import chalk from 'chalk';

import { Client, InvitationEncoder } from '@dxos/client';

import { BaseCommand } from '../../base-command';
import { acceptInvitation } from '../../util';

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
      if (client.halo.identity.get()) {
        this.log(chalk`{red Profile already initialized.}`);
        return {};
      }

      if (!encoded) {
        encoded = await ux.prompt('Invitation');
      }
      if (encoded.startsWith('http')) {
        const searchParams = new URLSearchParams(encoded.substring(encoded.lastIndexOf('?')));
        encoded = searchParams.get('deviceInvitationCode') ?? encoded;
      }
      const invitation = InvitationEncoder.decode(encoded!);

      const observable = client.halo.acceptInvitation(invitation);
      ux.action.start('Waiting for peer to connect');
      const invitationSuccess = acceptInvitation({
        observable,
        callbacks: {
          onConnecting: async () => {
            ux.action.stop();
          },
          onReadyForAuth: () => ux.prompt('Invitation code'),
        },
      });

      ux.action.start('Waiting for peer to finish invitation');
      await invitationSuccess;
      ux.action.stop();
    });
  }
}
