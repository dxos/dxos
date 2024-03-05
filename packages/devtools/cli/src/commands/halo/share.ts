//
// Copyright 2023 DXOS.org
//

import { Flags, ux } from '@oclif/core';
import chalk from 'chalk';

import { type Client, PublicKey } from '@dxos/client';
import { InvitationEncoder } from '@dxos/client/invitations';

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
    origin: Flags.string({
      description: 'Base URL of the application to join the invitation, e.g. https://composer.dxos.org',
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
            if (this.flags.origin) {
              const invitationUrl = new URL(this.flags.origin);
              // TODO: dedupe name of search param with Shell?
              invitationUrl.searchParams.append('deviceInvitationCode', invitationCode);
              this.log(chalk`{blue URL}: ${invitationUrl}`);
            }
            !this.flags.noCode && this.log(chalk`\n{red Secret}: ${observable.get().authCode}\n`);
          },
        },
      });

      ux.action.start('Waiting for peer to connect');
      await invitationSuccess;
      ux.action.stop();
      ux.log(chalk`{green Joined successfully.}`);
    });
  }
}
