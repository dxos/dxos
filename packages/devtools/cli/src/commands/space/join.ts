//
// Copyright 2022 DXOS.org
//

import { CliUx, Flags } from '@oclif/core';
import chalk from 'chalk';

import { Client, invitationObservable, InvitationEncoder } from '@dxos/client';

import { BaseCommand } from '../../base-command';
import { mapMembers, printMembers } from '../../util';

export default class Join extends BaseCommand {
  static override enableJsonFlag = true;
  static override description = 'Join space invitation.';
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
      encoded = await CliUx.ux.prompt(chalk`\n{blue Invitation}`);
    }
    if (!secret) {
      secret = await CliUx.ux.prompt(chalk`\n{red Secret}`);
    }

    return await this.execWithClient(async (client: Client) => {
      CliUx.ux.action.start('Waiting for peer to connect');
      const observable = client.echo.acceptInvitation(InvitationEncoder.decode(encoded!));
      const invitation = await invitationObservable(observable);
      const party = client.echo.getParty(invitation.spaceKey!)!;
      CliUx.ux.action.stop();

      const { value: members } = party.queryMembers();
      if (!json) {
        printMembers(members);
      }

      return {
        key: party.key.toHex(),
        name: party.getProperty('name'),
        members: mapMembers(members)
      };
    });
  }
}
