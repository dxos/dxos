//
// Copyright 2022 DXOS.org
//

import { Client } from '@dxos/client';
import { truncateKey } from '@dxos/debug';

import { BaseCommand } from '../../base-command';
import { selectSpace } from '../../util';

// TODO(burdon): Reconcile invite/share.
export default class Invite extends BaseCommand {
  static override description = 'Create space invitation.';
  static override args = [
    {
      name: 'key'
    }
  ];

  async run(): Promise<any> {
    const { args } = await this.parse(Invite);
    let { key } = args;

    return await this.execWithClient(async (client: Client) => {
      const { value: spaces = [] } = await client.echo.querySpaces();
      if (!key) {
        key = await selectSpace(spaces);
      }

      const space = spaces.find((space) => space.key.toHex().startsWith(key));
      if (!space) {
        this.log(`Invalid key: ${truncateKey(key)}`);
      }

      /*
      const invitation = await space.createInvitation();
      const descriptor = invitation.encode();
      const secret = invitation.secret.toString();

      this.log(chalk`\n{blue Invitation}: ${descriptor}`);
      this.log(chalk`\n{red Secret}: ${secret}\n`);

      try {
        CliUx.ux.action.start('Waiting for peer to connect');
        await invitation.wait(timeout * 1_000);
        CliUx.ux.action.stop();

        const { value: members } = space.queryMembers();
        printMembers(members);

        // TODO(burdon): Wait to replicate.
        await sleep(5_000);
      } catch (err: any) {
        CliUx.ux.action.stop(String(err));

        invitation.cancel();
      }
      */
    });
  }
}
