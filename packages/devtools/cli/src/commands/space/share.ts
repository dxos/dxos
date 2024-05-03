//
// Copyright 2022 DXOS.org
//

import { ux, Args, Flags } from '@oclif/core';
import chalk from 'chalk';

import { type Client } from '@dxos/client';
import { InvitationEncoder } from '@dxos/client/invitations';
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';

import { BaseCommand } from '../../base-command';
import { hostInvitation } from '../../util';

export default class Share extends BaseCommand<typeof Share> {
  static override description = 'Create space invitation.';
  static override args = { key: Args.string({ description: 'Space key head in hex.' }) };
  static override flags = {
    ...BaseCommand.flags,
    multiple: Flags.boolean({
      description: 'Multiple use.',
    }),
    'no-auth': Flags.boolean({
      description: 'Skip authentication challenge.',
    }),
    timeout: Flags.integer({
      description: 'Timeout in milliseconds.',
      default: 5_000,
    }),
    origin: Flags.string({
      description: 'Base URL of the application to join the invitation, e.g. https://composer.dxos.org',
    }),
    lifetime: Flags.integer({
      description: 'Lifetime of the invitation in seconds',
      default: 86400,
    }),
    persistent: Flags.boolean({
      description: 'Invitation should resume if client restarts',
      default: true,
    }),
    // TODO(nf): --no- doesn't work
    'no-persistent': Flags.boolean({
      description: "Don't resume invitation if client restarts",
      default: true,
    }),
    'no-wait': Flags.boolean({
      description: "Don't wait for a peer to connect before exiting CLI.",
      default: true,
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
            const invitationCode = InvitationEncoder.encode(observable.get());
            this.log(chalk`\n{blue Invitation}: ${invitationCode}`);
            if (authMethod !== Invitation.AuthMethod.NONE) {
              this.log(chalk`\n{red Secret}: ${observable.get().authCode}\n`);
            } else {
              this.log('');
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
