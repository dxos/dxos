//
// Copyright 2022 DXOS.org
//

import { ux } from '@oclif/core';
import chalk from 'chalk';

import { Client } from '@dxos/client';
import { InvitationEncoder } from '@dxos/client/invitations';

import { BaseCommand } from '../../base-command';
import { hostInvitation } from '../../util';

export default class Invite extends BaseCommand<typeof Invite> {
  static override description = 'Create device invitation.';

  async run(): Promise<any> {
    return await this.execWithClient(async (client: Client) => {
      const observable = client.halo.createInvitation();
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
