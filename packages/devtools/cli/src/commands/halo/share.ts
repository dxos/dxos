//
// Copyright 2023 DXOS.org
//

import { Flags, ux } from '@oclif/core';
import chalk from 'chalk';

import { type Client } from '@dxos/client';
import { Invitation, InvitationEncoder } from '@dxos/client/invitations';

import { BaseCommand } from '../../base-command';
import { hostInvitation } from '../../util';

export default class Share extends BaseCommand<typeof Share> {
  static override enableJsonFlag = true;
  static override description = 'Create HALO (device) invitation.';

  static override flags = {
    ...super.flags,
    noCode: Flags.boolean({
      description: 'Flag that specifies if secret auth code is not required',
      default: false,
    }),
  };

  async run(): Promise<any> {
    return await this.execWithClient(async (client: Client) => {
      if (!client.halo.identity.get()) {
        this.log(chalk`{red Profile not initialized.}`);
        return {};
      }

      const observable = client.halo.share({
        authMethod: this.flags.noCode ? Invitation.AuthMethod.NONE : Invitation.AuthMethod.SHARED_SECRET,
      });
      const invitationSuccess = hostInvitation({
        observable,
        callbacks: {
          onConnecting: async () => {
            const invitationCode = InvitationEncoder.encode(observable.get());
            this.log(chalk`\n{blue Invitation}: ${invitationCode}`);
            !this.flags.noCode && this.log(chalk`\n{red Secret}: ${observable.get().authCode}\n`);
          },
        },
      });

      ux.action.start('Waiting for peer to connect');
      await invitationSuccess;
      ux.action.stop();
    });
  }
}
