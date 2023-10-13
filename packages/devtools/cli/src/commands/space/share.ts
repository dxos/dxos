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
  };

  async run(): Promise<any> {
    const { key } = this.args;
    return await this.execWithClient(async (client: Client) => {
      const space = await this.getSpace(client, key);

      // TODO(burdon): Timeout error not propagated.
      const type = this.flags.multiple ? Invitation.Type.MULTIUSE : undefined;
      const authMethod = this.flags['no-auth'] ? Invitation.AuthMethod.NONE : undefined;
      const observable = space!.share({ type, authMethod, timeout: this.flags.timeout });
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
      });

      // TODO(burdon): Display joined peer?
      ux.action.start('Waiting for peer to connect');
      await invitationSuccess;
      ux.action.stop();
    });
  }
}
