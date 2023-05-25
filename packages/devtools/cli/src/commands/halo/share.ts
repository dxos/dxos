//
// Copyright 2023 DXOS.org
//

import { ux } from '@oclif/core';
import chalk from 'chalk';

import { Client, InvitationEncoder } from '@dxos/client';

import { BaseCommand } from '../../base-command';
import { hostInvitation } from '../../util/invitation';

export default class Share extends BaseCommand {
  static override enableJsonFlag = true;
  static override description = 'Create HALO (device) invitation.';

  async run(): Promise<any> {
    return await this.execWithClient(async (client: Client) => {
      if (!client.halo.identity.get()) {
        this.log(chalk`{red Profile not initialized.}`);
        return {};
      }

      const observable = client.halo.createInvitation();
      const invitationSuccess = hostInvitation(observable, {
        onConnecting: async () => {
          const invitationCode = InvitationEncoder.encode(observable.get());

          this.log(chalk`\n{blue Invitation}: ${invitationCode}`);
          this.log(chalk`\n{red Secret}: ${observable.get().authCode}\n`);
        },
      });

      ux.action.start('Waiting for peer to connect');
      await invitationSuccess;
      ux.action.stop();
    });
  }
}
