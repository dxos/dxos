//
// Copyright 2022 DXOS.org
//

import { ux, Args } from '@oclif/core';
import chalk from 'chalk';

import { Client } from '@dxos/client';
import { InvitationEncoder } from '@dxos/client/invitations';

import { BaseCommand } from '../../base-command';
import { hostInvitation } from '../../util';

export default class Share extends BaseCommand<typeof Share> {
  static override description = 'Create space invitation.';
  static override args = { key: Args.string({ description: 'Space key head in hex.' }) };

  async run(): Promise<any> {
    const { key } = this.args;
    return await this.execWithClient(async (client: Client) => {
      const space = await this.getSpace(client, key);

      // TODO(burdon): Timeout error not propagated.
      const observable = space!.createInvitation(); // ({ timeout: 5000 });
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

      // TODO(burdon): Display joined peer?
      ux.action.start('Waiting for peer to connect');
      await invitationSuccess;
      ux.action.stop();
    });
  }
}
