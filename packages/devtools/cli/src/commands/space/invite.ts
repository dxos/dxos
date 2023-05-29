//
// Copyright 2022 DXOS.org
//

import { ux, Args } from '@oclif/core';
import chalk from 'chalk';

import { Client, InvitationEncoder } from '@dxos/client';
import { truncateKey } from '@dxos/debug';

import { BaseCommand } from '../../base-command';
import { selectSpace, hostInvitation } from '../../util';

// TODO(burdon): Reconcile invite/share.
export default class Invite extends BaseCommand {
  static override description = 'Create space invitation.';
  static override args = { key: Args.string({ required: true }) };

  async run(): Promise<any> {
    const { args } = await this.parse(Invite);
    let { key } = args;

    return await this.execWithClient(async (client: Client) => {
      const spaces = client.spaces.get();
      if (!key) {
        key = await selectSpace(spaces);
      }

      const space = spaces.find((space) => space.key.toHex().startsWith(key));
      if (!space) {
        throw new Error(`Invalid key: ${truncateKey(key)}`);
      }

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

      ux.action.start('Waiting for peer to connect');
      await invitationSuccess;
      ux.action.stop();
    });
  }
}
