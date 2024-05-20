//
// Copyright 2023 DXOS.org
//

import { Flags, ux } from '@oclif/core';
import chalk from 'chalk';
import { write as copy } from 'node-clipboardy';
import { spawn } from 'node:child_process';

import { type Client } from '@dxos/client';
import { Invitation, InvitationEncoder } from '@dxos/client/invitations';

import { BaseCommand } from '../../base-command';
import { hostInvitation } from '../../util';

export default class Share extends BaseCommand<typeof Share> {
  static override enableJsonFlag = true;
  static override description = 'Create HALO (device) invitation.';

  static override flags = {
    ...super.flags,
    lifetime: Flags.integer({
      description: 'Lifetime of the invitation in seconds',
      default: 86400,
    }),
    open: Flags.boolean({
      description: 'Open browser with invitation.',
    }),
    host: Flags.string({
      description: 'Application Host URL.',
      default: 'https://composer.space',
    }),
    'no-auth': Flags.boolean({
      description: 'Skip authentication challenge.',
    }),
    // TODO(nf): --no- doesn't work
    'no-persistent': Flags.boolean({
      description: "Don't resume invitation if client restarts",
    }),
    'no-wait': Flags.boolean({
      description: "Don't wait for a peer to connect before exiting CLI.",
    }),
  };

  async run(): Promise<any> {
    return await this.execWithClient(async (client: Client) => {
      if (!client.halo.identity.get()) {
        this.log(chalk`{red Profile not initialized.}`);
        return {};
      }

      const authMethod = this.flags['no-auth'] ? Invitation.AuthMethod.NONE : undefined;
      const observable = client.halo.share({
        authMethod,
        timeout: this.flags.timeout,
        persistent: this.flags.persistent,
        lifetime: this.flags.lifetime,
      });

      const invitationSuccess = hostInvitation({
        observable,
        callbacks: {
          onConnecting: async () => {
            const invitation = observable.get();
            const invitationCode = InvitationEncoder.encode(invitation);

            if (authMethod !== Invitation.AuthMethod.NONE) {
              this.log(chalk`\n{red Secret}: ${observable.get().authCode}\n`);
              copy(invitation.authCode!);
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
        waitForSuccess: false,
      });

      if (!this.flags['no-wait']) {
        ux.action.start('Waiting for peer to connect');
        await invitationSuccess;
        ux.action.stop();
        ux.log(chalk`{green Joined successfully.}`);
      } else {
        await invitationSuccess;
      }
    });
  }
}
