//
// Copyright 2023 DXOS.org
//

import { ux, Flags } from '@oclif/core';
import chalk from 'chalk';

import { asyncTimeout, Trigger } from '@dxos/async';
import { type Client } from '@dxos/client';
import { type Invitation, InvitationEncoder } from '@dxos/client/invitations';

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
    timeout: Flags.integer({
      description: 'Timeout in seconds',
      default: 300,
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
      let invitation: Invitation;
      try {
        invitation = await asyncTimeout(
          Promise.all([
            acceptInvitation({
              observable: client.halo.join(InvitationEncoder.decode(encoded!)),
              callbacks: {
                onConnecting: async () => ux.action.stop(),
                onReadyForAuth: async () => secret ?? ux.prompt(chalk`\n{red Secret}`),
                onSuccess: async () => {
                  done.wake();
                },
              },
            }),
            done.wait(),
          ]).then((ret) => ret[0]),
          this.flags.timeout * 1000,
        );
      } catch (err: any) {
        ux.log();
        this.error(chalk`{red Timeout waiting for device join to complete: ${err.message}}`);
      }

      ux.log();
      ux.log(chalk`{green Joined successfully.}`);

      return {
        identityKey: invitation.identityKey,
      };
    });
  }
}
