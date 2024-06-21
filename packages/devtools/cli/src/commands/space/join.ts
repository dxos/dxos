//
// Copyright 2022 DXOS.org
//

import { Flags, ux } from '@oclif/core';
import chalk from 'chalk';
import inquirer from 'inquirer';

import { sleep, Trigger } from '@dxos/async';
import { acceptInvitation } from '@dxos/cli-base';

import { BaseCommand } from '../../base';

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
    return await this.execWithClient(async ({ client }) => {
      let { invitation: encoded, secret } = this.flags;
      if (!encoded) {
        const { invitation } = await inquirer.prompt<{ invitation: string }>({
          name: 'invitation',
          message: 'Invitation',
        });
        encoded = invitation;
      }

      if (encoded.startsWith('http') || encoded.startsWith('socket')) {
        const searchParams = new URLSearchParams(encoded.substring(encoded.lastIndexOf('?')));
        encoded = searchParams.get('spaceInvitationCode') ?? encoded; // TODO(burdon): Const.
      }

      ux.action.start('Waiting for peer to connect');
      const done = new Trigger();
      // TODO(burdon): Error code if joining same space (don't throw!)
      const invitation = await acceptInvitation({
        observable: client.spaces.join(encoded!),
        callbacks: {
          onConnecting: async () => ux.action.stop(),
          onReadyForAuth: async () => {
            if (!secret) {
              const { secret } = await inquirer.prompt<{ secret: string }>({
                name: 'secret',
                message: chalk`\n{red Secret}`,
              });
              return secret;
            }
            return secret;
          },
          onSuccess: async () => {
            done.wake();
          },
        },
      });

      await done.wait();
      // TODO(burdon): Race condition.
      await sleep(1000);
      const space = client.spaces.get(invitation.spaceKey!)!;
      ux.stdout(chalk`{green Joined successfully.}`);

      return {
        key: space.key,
      };
    });
  }
}
