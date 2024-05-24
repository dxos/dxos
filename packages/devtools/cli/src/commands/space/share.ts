//
// Copyright 2022 DXOS.org
//

import { Flags, ux } from '@oclif/core';
import chalk from 'chalk';
import { write as copy } from 'node-clipboardy';
import { spawn } from 'node:child_process';

import { type Client } from '@dxos/client';
import { InvitationEncoder } from '@dxos/client/invitations';
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';

import { ARG_SPACE_KEYS, BaseCommand } from '../../base';
import { hostInvitation } from '../../util';

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
    'no-auth': Flags.boolean({
      description: 'Skip authentication challenge.',
    }),
    'no-wait': Flags.boolean({
      description: "Don't wait for a peer to connect before exiting CLI",
    }),
  };

  async run(): Promise<any> {
    const { key } = this.args;
    return await this.execWithClient(async (client: Client) => {
      const space = await this.getSpace(client, key);

      // TODO(burdon): Timeout error not propagated.
      const authMethod = this.flags['no-auth'] ? Invitation.AuthMethod.NONE : undefined;
      const observable = space!.share({
        authMethod,
        multiUse: this.flags.multiple,
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
              copy(invitation.authCode!);
              this.log(chalk`\n{red Secret}: ${observable.get().authCode} (copied to clipboard)\n`);
            }

            if (this.flags.open) {
              const url = new URL(this.flags.host);
              url.searchParams.append('spaceInvitationCode', InvitationEncoder.encode(invitation));
              // TODO: remove after the demo
              url.searchParams.append('migrateSpace', 'true');
              spawn('open', [url.toString()]);
            } else {
              this.log(chalk`\n{blue Invitation}: ${invitationCode}`);
            }
          },
        },
        waitForSuccess: false,
      });

      if (!this.flags['no-wait']) {
        // TODO(burdon): Display joined peer?
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
