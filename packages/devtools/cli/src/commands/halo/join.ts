//
// Copyright 2023 DXOS.org
//

import { ux, Flags } from '@oclif/core';
import chalk from 'chalk';

import { Client } from '@dxos/client';
import { InvitationEncoder } from '@dxos/client/invitations';

import { BaseCommand } from '../../base-command';
import { acceptInvitation } from '../../util';

export default class Join extends BaseCommand<typeof Join> {
  static override enableJsonFlag = true;
  static override description = 'Join HALO (device) invitation.';

  static override flags = {
    ...BaseCommand.flags,
    invitation: Flags.string({
      description: 'Invitation code',
    }),
  };

  async run(): Promise<any> {
    let { invitation: encoded } = this.flags;

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
          onConnecting: async () => ux.action.stop(),
          onReadyForAuth: () => ux.prompt('Invitation code'),
        },
      });

      await invitationSuccess;
      ux.log();
      ux.log(chalk`{green Success.}`);
    });
  }
}
