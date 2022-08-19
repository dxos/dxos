//
// Copyright 2022 DXOS.org
//

import { CliUx, Flags } from '@oclif/core';

import { Client, InvitationDescriptor } from '@dxos/client';

import { BaseCommand } from '../../base-command';

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
    let { invitation: encoded, secret } = flags;
    // TODO(burdon): Use inquirer.
    if (!encoded) {
      encoded = await CliUx.ux.prompt('Invitation');
    }
    if (!secret) {
      secret = await CliUx.ux.prompt('Secret');
    }

    return await this.execWithClient(async (client: Client) => {
      const invitation = client.echo.acceptInvitation(InvitationDescriptor.decode(encoded!));
      await invitation.authenticate(Buffer.from(secret!));
      const party = await invitation.getParty();
      const data = {
        key: party.key.toHex(),
        name: party.getProperty('name')
      };

      this.log(`Joined: ${data.key}`);
      return data;
    });
  }
}
