//
// Copyright 2022 DXOS.org
//

import { Flags, ux } from '@oclif/core';
import chalk from 'chalk';
import { write as copy } from 'node-clipboardy';
import { spawn } from 'node:child_process';

import { hostInvitation, ARG_SPACE_KEYS } from '@dxos/cli-base';
import { InvitationEncoder } from '@dxos/client/invitations';
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';

import { BaseCommand } from '../../base';

export default class Share extends BaseCommand<typeof Share> {
  static override description = 'Create space invitation.';
  static override args = ARG_SPACE_KEYS;
  static override flags = {
    ...BaseCommand.flags,
    multiple: Flags.boolean({
      description: 'Multiple use.',
    }),
    lifetime: Flags.integer({
      description: 'Lifetime of the invitation in seconds',
      default: 86400,
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
    const { key } = this.args;
    return await this.execWithClient(async ({ client }) => {
      const space = await this.getSpace(client, key);
      const authMethod = this.flags.auth ? Invitation.AuthMethod.SHARED_SECRET : Invitation.AuthMethod.NONE;
      const observable = space!.share({
        authMethod,
        timeout: this.flags.timeout,
        persistent: this.flags.persistent,
        lifetime: this.flags.lifetime,
        multiUse: this.flags.multiple,
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
              url.searchParams.append('spaceInvitationCode', InvitationEncoder.encode(invitation));
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
