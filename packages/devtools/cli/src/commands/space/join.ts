//
// Copyright 2022 DXOS.org
//

import { ux, Flags } from '@oclif/core';
import chalk from 'chalk';

import { sleep, Trigger } from '@dxos/async';
import { type Client } from '@dxos/client';

import { BaseCommand } from '../../base';
import { acceptInvitation } from '../../util';

export default class Join extends BaseCommand<typeof Join> {
  static override enableJsonFlag = true;
  static override description = 'Join space invitation';
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
    return await this.execWithClient(async (client: Client) => {
      let { invitation: encoded, secret } = this.flags;
      if (!encoded) {
        encoded = await ux.prompt(chalk`\n{blue Invitation}`);
      }

      if (encoded.startsWith('http') || encoded.startsWith('socket')) {
        const searchParams = new URLSearchParams(encoded.substring(encoded.lastIndexOf('?')));
        encoded = searchParams.get('spaceInvitationCode') ?? encoded; // TODO(burdon): Const.
      }

      ux.log('');
      ux.action.start('Waiting for peer to connect');
      const done = new Trigger();
      // TODO(burdon): Error code if joining same space (don't throw!)
      const invitation = await acceptInvitation({
        observable: client.spaces.join(encoded!),
        callbacks: {
          onConnecting: async () => ux.action.stop(),
          onReadyForAuth: async () => secret ?? ux.prompt(chalk`\n{red Secret}`),
          onSuccess: async () => {
            done.wake();
          },
        },
      });

      await done.wait();
      // TODO(burdon): Race condition.
      await sleep(1000);
      const space = client.spaces.get(invitation.spaceKey!)!;

      ux.log();
      ux.log(chalk`{green Joined successfully.}`);

      return {
        key: space.key,
      };
    });
  }
}
