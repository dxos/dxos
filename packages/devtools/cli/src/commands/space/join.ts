//
// Copyright 2022 DXOS.org
//

import { ux, Flags } from '@oclif/core';
import chalk from 'chalk';

import { Client, InvitationEncoder, wrapObservable } from '@dxos/client';

import { BaseCommand } from '../../base-command';
import { mapMembers, printMembers } from '../../util';

export default class Join extends BaseCommand {
  static override enableJsonFlag = true;
  static override description = 'Join space invitation';
  static override flags = {
    ...BaseCommand.flags,
    invitation: Flags.string({
      description: 'Invitation code'
    }),
    secret: Flags.string({
      description: 'Invitation secret'
    })
  };

  async run(): Promise<any> {
    const { flags } = await this.parse(Join);
    let { invitation: encoded, secret, json } = flags;
    if (!encoded) {
      encoded = await ux.prompt(chalk`\n{blue Invitation}`);
    }
    if (!secret) {
      secret = await ux.prompt(chalk`\n{red Secret}`);
    }

    return await this.execWithClient(async (client: Client) => {
      ux.action.start('Waiting for peer to connect');
      const observable = await client.echo.acceptInvitation(InvitationEncoder.decode(encoded!));
      // TODO(burdon): Don't use wrapper since doesn't handle auth.
      const invitation = await wrapObservable(observable);
      const space = client.echo.getSpace(invitation.spaceKey!)!;
      ux.action.stop();

      const members = space.members.get();
      if (!json) {
        printMembers(members);
      }

      return {
        key: space.key.toHex(),
        name: space.properties.name,
        members: mapMembers(members)
      };
    });
  }
}
