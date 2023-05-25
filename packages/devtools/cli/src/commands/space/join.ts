//
// Copyright 2022 DXOS.org
//

import { ux, Flags } from '@oclif/core';
import chalk from 'chalk';

import { Client, InvitationEncoder } from '@dxos/client';

import { BaseCommand } from '../../base-command';
import { acceptInvitation, mapMembers, printMembers } from '../../util';

export default class Join extends BaseCommand {
  static override enableJsonFlag = true;
  static override description = 'Join space invitation';
  static override flags = {
    ...BaseCommand.flags,
    invitation: Flags.string({
      description: 'Invitation code',
    }),
    secret: Flags.string({
      description: 'Invitation secret',
    }),
  };

  async run(): Promise<any> {
    return await this.execWithClient(async (client: Client) => {
      const { flags } = await this.parse(Join);
      let { invitation: encoded, secret, json } = flags;
      if (!encoded) {
        encoded = await ux.prompt(chalk`\n{blue Invitation}`);
      }
      if (encoded.startsWith('http')) {
        const searchParams = new URLSearchParams(encoded.substring(encoded.lastIndexOf('?')));
        encoded = searchParams.get('spaceInvitationCode') ?? encoded;
      }

      ux.action.start('Waiting for peer to connect');
      const observable = client.acceptInvitation(InvitationEncoder.decode(encoded!));

      const invitationSuccess = acceptInvitation(observable, {
        onConnecting: async () => {
          this.log('Waiting for peer to connect...');
        },
        onReadyForAuth: async () => secret ?? ux.prompt(chalk`\n{red Secret}`),
      });

      ux.action.start('Waiting for peer to finish invitation');
      const invitation = await invitationSuccess;
      ux.action.stop();

      const space = client.getSpace(invitation.spaceKey!)!;

      const members = space.members.get();
      if (!json) {
        printMembers(members);
      }

      return {
        key: space.key.toHex(),
        name: space.properties.name,
        members: mapMembers(members),
      };
    });
  }
}
