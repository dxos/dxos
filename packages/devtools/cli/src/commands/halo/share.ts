//
// Copyright 2023 DXOS.org
//

import { Flags, ux } from '@oclif/core';
import chalk from 'chalk';
import { write as copy } from 'node-clipboardy';
import { spawn } from 'node:child_process';

import { hostInvitation } from '@dxos/cli-base';
import { Invitation, InvitationEncoder } from '@dxos/client/invitations';

import { BaseCommand } from '../../base';

export default class Share extends BaseCommand<typeof Share> {
  static override enableJsonFlag = true;
  static override description = 'Create HALO (device) invitation.';

  static override flags = {
    ...BaseCommand.flags,
    lifetime: Flags.integer({
      description: 'Lifetime of the invitation in seconds',
      default: 12 * 60 * 60,
    }),
    persistent: Flags.boolean({
      description: 'Invitation should resume if client restarts',
      default: true,
    }),
    open: Flags.boolean({
      description: 'Open browser with invitation.',
    }),
    host: Flags.string({
      description: 'Application Host URL.',
      default: 'https://composer.space',
    }),
    auth: Flags.boolean({
      description: 'Skip authentication challenge.',
      default: true,
      allowNo: true,
    }),
  };

  async run(): Promise<any> {
    return await this.execWithClient(async ({ client }) => {
      const authMethod = this.flags.auth ? Invitation.AuthMethod.SHARED_SECRET : Invitation.AuthMethod.NONE;
      const observable = client.halo.share({
        authMethod,
        timeout: this.flags.timeout,
        persistent: this.flags.persistent,
        lifetime: this.flags.lifetime,
      });

      ux.action.start('Waiting for peer to connect');
      await hostInvitation({
        observable,
        callbacks: {
          onConnecting: async () => {
            ux.action.stop();
            const invitation = observable.get();
            const invitationCode = InvitationEncoder.encode(invitation);
            if (authMethod !== Invitation.AuthMethod.NONE) {
              copy(invitation.authCode!);
              this.log(chalk`\n{red Secret}: ${observable.get().authCode} (copied to clipboard)\n`);
            }

            if (this.flags.open) {
              const url = new URL(this.flags.host);
              url.searchParams.append('deviceInvitationCode', InvitationEncoder.encode(invitation));
              spawn('open', [url.toString()]);
            } else {
              this.log(chalk`\n{blue Invitation}: ${invitationCode}`);
            }
          },
        },
      });

      ux.stdout(chalk`{green OK}`);
    });
  }
}
