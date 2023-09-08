//
// Copyright 2023 DXOS.org
//

import { ux, Flags } from '@oclif/core';
import chalk from 'chalk';

import { Trigger } from '@dxos/async';
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
    secret: Flags.string({
      description: 'Invitation secret',
    }),
  };

  async run(): Promise<any> {
    let { invitation: encoded, secret } = this.flags;

    return await this.execWithClient(async (client: Client) => {
      if (client.halo.identity.get()) {
        this.error(chalk`{red Profile already initialized.}`);
      }

      if (!encoded) {
        encoded = await ux.prompt('Invitation');
      }
      if (encoded.startsWith('http')) {
        const searchParams = new URLSearchParams(encoded.substring(encoded.lastIndexOf('?')));
        encoded = searchParams.get('deviceInvitationCode') ?? encoded;
      }

      ux.log('');
      ux.action.start('Waiting for peer to connect');
      const done = new Trigger();
      const invitation = await acceptInvitation({
        observable: client.halo.join(InvitationEncoder.decode(encoded!)),
        callbacks: {
          onConnecting: async () => ux.action.stop(),
          onReadyForAuth: async () => secret ?? ux.prompt(chalk`\n{red Secret}`),
          onSuccess: async () => {
            done.wake();
          },
        },
      });

      await done.wait();

      ux.log();
      ux.log(chalk`{green Joined}: ${invitation.identityKey!.truncate()}`);

      return {
        identityKey: invitation.identityKey,
      };
    });
  }
}
