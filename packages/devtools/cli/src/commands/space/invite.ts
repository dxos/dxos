//
// Copyright 2022 DXOS.org
//

import { ux, Args } from '@oclif/core';
import chalk from 'chalk';

import { Client } from '@dxos/client';
import { InvitationEncoder } from '@dxos/client/invitations';
import { truncateKey } from '@dxos/debug';

import { BaseCommand } from '../../base-command';
import { selectSpace, hostInvitation } from '../../util';

export default class Invite extends BaseCommand<typeof Invite> {
  static override description = 'Create space invitation.';
  static override args = { key: Args.string({ description: 'Space key head in hex.' }) };

  async run(): Promise<any> {
    let { key } = this.args;

    return await this.execWithClient(async (client: Client) => {
      const spaces = client.spaces.get();
      if (!key) {
        key = await selectSpace(spaces);
      }

      const space = spaces.find((space) => space.key.toHex().startsWith(key!));
      if (!space) {
        throw new Error(`Invalid key: ${truncateKey(key)}`);
      }

      await space.waitUntilReady();

      const observable = space.createInvitation();
      const invitationSuccess = hostInvitation({
        observable,
        callbacks: {
          onConnecting: async () => {
            const invitationCode = InvitationEncoder.encode(observable.get());

            this.log(chalk`\n{blue Invitation}: ${invitationCode}`);
            this.log(chalk`\n{red Secret}: ${observable.get().authCode}\n`);
          },
        },
      });

      ux.action.start('Waiting for peer to connect...');
      await invitationSuccess;
      ux.action.stop();
    });
  }
}
