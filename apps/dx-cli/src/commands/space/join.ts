//
// Copyright 2022 DXOS.org
//

import { CliUx, Flags } from '@oclif/core';
import chalk from 'chalk';

import { Client, InvitationDescriptorWrapper } from '@dxos/client';

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

  async run (): Promise<any> {
    const { flags } = await this.parse(Join);
    let { invitation: encoded, secret, json } = flags;
    if (!encoded) {
      encoded = await CliUx.ux.prompt(chalk`\n{blue Invitation}`);
    }
    if (!secret) {
      secret = await CliUx.ux.prompt(chalk`\n{red Secret}`);
    }

    return await this.execWithClient(async (client: Client) => {
      const invitation = client.echo.acceptInvitation(InvitationDescriptorWrapper.decode(encoded!));
      await invitation.authenticate(Buffer.from(secret!));

      // TODO(burdon): Change blocking call in API.
      CliUx.ux.action.start('Waiting for peer to connect');
      const party = await invitation.getParty();
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
