//
// Copyright 2022 DXOS.org
//

import { ux, Flags } from '@oclif/core';
import chalk from 'chalk';
import assert from 'node:assert';

import { Client, InvitationEncoder } from '@dxos/client';

import { BaseCommand } from '../../base-command';
import { acceptInvitation, mapMembers, printMembers } from '../../util';

export default class Join extends BaseCommand<typeof Join> {
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
      let { invitation: encoded, secret, json } = this.flags;
      if (!encoded) {
        encoded = await ux.prompt(chalk`\n{blue Invitation}`);
      }
      if (encoded.startsWith('http')) {
        const searchParams = new URLSearchParams(encoded.substring(encoded.lastIndexOf('?')));
        encoded = searchParams.get('spaceInvitationCode') ?? encoded;
      }

      let invitation = InvitationEncoder.decode(encoded!);

      const observable = client.acceptInvitation(invitation);
      ux.action.start('Waiting for peer to connect');
      const invitationSuccess = acceptInvitation({
        observable,
        callbacks: {
          onConnecting: async () => {
            ux.action.stop();
          },
          onReadyForAuth: async () => secret ?? ux.prompt(chalk`\n{red Secret}`),
        },
      });

      ux.action.start('Waiting for peer to finish invitation');
      invitation = await invitationSuccess;
      ux.action.stop();

      assert(invitation.spaceKey);
      const space = client.getSpace(invitation.spaceKey)!;
      await space.waitUntilReady();
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
